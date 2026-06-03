package com.dppsmart.dppsmart.Security.Session;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.User.Entities.Token;
import com.dppsmart.dppsmart.User.Repositories.TokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private static final int MAX_SESSIONS_PER_USER = 10;

    private static final long SUSPICIOUS_WINDOW_MINUTES = 10;
    private static final long SUSPICIOUS_LOGIN_THRESHOLD = 5;

    private final UserSessionRepository sessionRepository;
    private final TokenRepository tokenRepository;
    private final NotificationServiceImpl notificationService;

    public UserSession createSession(String userId, String tokenId, String accessToken,
                                     HttpServletRequest request, LocalDateTime expiresAt) {
        String ua = request.getHeader("User-Agent");
        String ip = DeviceParser.extractIp(request);

        UserSession session = new UserSession();
        session.setId(NanoIdUtils.randomNanoId());
        session.setUserId(userId);
        session.setTokenId(tokenId);

        session.setAccessToken(accessToken != null && accessToken.length() > 10
                ? accessToken.substring(0, 10) + "…" : "");
        session.setDeviceName(DeviceParser.extractDeviceName(ua));
        session.setBrowser(DeviceParser.extractBrowser(ua));
        session.setOs(DeviceParser.extractOs(ua));
        session.setIpAddress(ip);
        session.setUserAgent(ua);
        session.setSessionStatus(UserSession.SessionStatus.ACTIVE.name());
        session.setLoginTime(LocalDateTime.now());
        session.setLastActivity(LocalDateTime.now());
        session.setExpiresAt(expiresAt);

        detectSuspicion(session, userId);
        pruneOldSessions(userId);

        return sessionRepository.save(session);
    }

    private void detectSuspicion(UserSession session, String userId) {
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(SUSPICIOUS_WINDOW_MINUTES);

        long recentLogins = sessionRepository
                .countByUserIdAndSessionStatusAndLoginTimeAfter(
                        userId, UserSession.SessionStatus.ACTIVE.name(), windowStart);

        if (recentLogins >= SUSPICIOUS_LOGIN_THRESHOLD) {
            session.setSuspicious(true);
            session.setSuspicionReason("Unusually high login frequency (" + (recentLogins + 1) + " in 10 min)");
            sendSecurityAlert(userId, "Suspicious Login Frequency",
                    "Multiple logins detected from " + session.getIpAddress()
                            + " within a short period. If this wasn't you, please revoke all sessions.");
        }

        List<UserSession> pastSessions = sessionRepository.findByUserIdOrderByLoginTimeDesc(userId);
        boolean knownIp = pastSessions.stream()
                .filter(s -> !s.getId().equals(session.getId()))
                .anyMatch(s -> session.getIpAddress() != null
                        && session.getIpAddress().equals(s.getIpAddress()));

        if (!knownIp && !pastSessions.isEmpty()) {
            if (!session.isSuspicious()) {
                session.setSuspicious(true);
                session.setSuspicionReason("Login from a new IP address: " + session.getIpAddress());
            }
            sendSecurityAlert(userId, "New Device Login",
                    "A new login was detected from IP " + session.getIpAddress()
                            + " using " + session.getDeviceName()
                            + ". If this wasn't you, please revoke this session immediately.");
        }
    }

    @Async
    protected void sendSecurityAlert(String userId, String title, String message) {
        try {
            notificationService.createNotification(
                    userId, title, message,
                    Notification.NotificationType.ALERT,
                    "/security"
            );
        } catch (Exception e) {
            log.warn("Failed to send security alert to user {}: {}", userId, e.getMessage());
        }
    }

    private void pruneOldSessions(String userId) {
        List<UserSession> all = sessionRepository.findByUserIdOrderByLoginTimeDesc(userId);
        if (all.size() >= MAX_SESSIONS_PER_USER) {

            List<UserSession> toExpire = all.subList(MAX_SESSIONS_PER_USER - 1, all.size());
            toExpire.forEach(s -> {
                s.setSessionStatus(UserSession.SessionStatus.EXPIRED.name());

                tokenRepository.findById(s.getTokenId()).ifPresent(t -> {
                    t.setRevoked(true);
                    t.setExpired(true);
                    tokenRepository.save(t);
                });
            });
            sessionRepository.saveAll(toExpire);
        }
    }

    public List<UserSessionDto> getSessionsForUser(String userId, String currentTokenId) {
        return sessionRepository.findByUserIdOrderByLoginTimeDesc(userId)
                .stream()
                .map(s -> UserSessionDto.from(s,
                        currentTokenId != null && currentTokenId.equals(s.getTokenId())))
                .collect(Collectors.toList());
    }

    public void revokeSession(String sessionId, String requestingUserId) {
        UserSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));

        if (!session.getUserId().equals(requestingUserId)) {
            throw new ForbiddenException("Cannot revoke another user's session");
        }

        session.setSessionStatus(UserSession.SessionStatus.REVOKED.name());
        sessionRepository.save(session);

        if (session.getTokenId() != null) {
            tokenRepository.findById(session.getTokenId()).ifPresent(t -> {
                t.setRevoked(true);
                t.setExpired(true);
                tokenRepository.save(t);
            });
        }
    }

    public void revokeAllSessions(String userId, String exceptTokenId) {
        List<UserSession> sessions = sessionRepository
                .findByUserIdAndSessionStatus(userId, UserSession.SessionStatus.ACTIVE.name());

        sessions.forEach(s -> {
            if (exceptTokenId != null && exceptTokenId.equals(s.getTokenId())) return;
            s.setSessionStatus(UserSession.SessionStatus.REVOKED.name());

            if (s.getTokenId() != null) {
                tokenRepository.findById(s.getTokenId()).ifPresent(t -> {
                    t.setRevoked(true);
                    t.setExpired(true);
                    tokenRepository.save(t);
                });
            }
        });
        sessionRepository.saveAll(sessions);
    }

    public void touchSession(String tokenId) {
        sessionRepository.findByTokenId(tokenId).ifPresent(s -> {
            if (UserSession.SessionStatus.ACTIVE.name().equals(s.getSessionStatus())) {
                s.setLastActivity(LocalDateTime.now());
                sessionRepository.save(s);
            }
        });
    }

    public void expireSessionByTokenId(String tokenId) {
        sessionRepository.findByTokenId(tokenId).ifPresent(s -> {
            s.setSessionStatus(UserSession.SessionStatus.EXPIRED.name());
            sessionRepository.save(s);
        });
    }

    public List<UserSessionDto> getSuspiciousSessions(String userId) {
        return sessionRepository.findByUserIdAndSuspiciousTrue(userId)
                .stream()
                .map(s -> UserSessionDto.from(s, false))
                .collect(Collectors.toList());
    }

    public String getTokenIdFromJwt(String tokenValue) {
        return tokenRepository.findByToken(tokenValue)
                .map(Token::getId)
                .orElse(null);
    }
}
