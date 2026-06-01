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
    // Window to detect suspicious login frequency: 5 logins in 10 min
    private static final long SUSPICIOUS_WINDOW_MINUTES = 10;
    private static final long SUSPICIOUS_LOGIN_THRESHOLD = 5;

    private final UserSessionRepository sessionRepository;
    private final TokenRepository tokenRepository;
    private final NotificationServiceImpl notificationService;

    // ─── Create session on login ───────────────────────────────────────────────

    public UserSession createSession(String userId, String tokenId, String accessToken,
                                     HttpServletRequest request, LocalDateTime expiresAt) {
        String ua = request.getHeader("User-Agent");
        String ip = DeviceParser.extractIp(request);

        UserSession session = new UserSession();
        session.setId(NanoIdUtils.randomNanoId());
        session.setUserId(userId);
        session.setTokenId(tokenId);
        // Store only a short prefix for safe display — never log the full token
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

    // ─── Detect suspicious logins ─────────────────────────────────────────────

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

        // New device detection: check if this IP has been seen before
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

    // ─── Keep session count manageable ────────────────────────────────────────

    private void pruneOldSessions(String userId) {
        List<UserSession> all = sessionRepository.findByUserIdOrderByLoginTimeDesc(userId);
        if (all.size() >= MAX_SESSIONS_PER_USER) {
            // Expire the oldest sessions beyond the limit
            List<UserSession> toExpire = all.subList(MAX_SESSIONS_PER_USER - 1, all.size());
            toExpire.forEach(s -> {
                s.setSessionStatus(UserSession.SessionStatus.EXPIRED.name());
                // Also revoke the corresponding token
                tokenRepository.findById(s.getTokenId()).ifPresent(t -> {
                    t.setRevoked(true);
                    t.setExpired(true);
                    tokenRepository.save(t);
                });
            });
            sessionRepository.saveAll(toExpire);
        }
    }

    // ─── List all sessions for current user ───────────────────────────────────

    public List<UserSessionDto> getSessionsForUser(String userId, String currentTokenId) {
        return sessionRepository.findByUserIdOrderByLoginTimeDesc(userId)
                .stream()
                .map(s -> UserSessionDto.from(s,
                        currentTokenId != null && currentTokenId.equals(s.getTokenId())))
                .collect(Collectors.toList());
    }

    // ─── Revoke one session ───────────────────────────────────────────────────

    public void revokeSession(String sessionId, String requestingUserId) {
        UserSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));

        if (!session.getUserId().equals(requestingUserId)) {
            throw new ForbiddenException("Cannot revoke another user's session");
        }

        session.setSessionStatus(UserSession.SessionStatus.REVOKED.name());
        sessionRepository.save(session);

        // Also revoke the corresponding JWT token
        if (session.getTokenId() != null) {
            tokenRepository.findById(session.getTokenId()).ifPresent(t -> {
                t.setRevoked(true);
                t.setExpired(true);
                tokenRepository.save(t);
            });
        }
    }

    // ─── Revoke ALL sessions for a user ──────────────────────────────────────

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

    // ─── Update last activity (called by JwtFilter on every request) ─────────

    public void touchSession(String tokenId) {
        sessionRepository.findByTokenId(tokenId).ifPresent(s -> {
            if (UserSession.SessionStatus.ACTIVE.name().equals(s.getSessionStatus())) {
                s.setLastActivity(LocalDateTime.now());
                sessionRepository.save(s);
            }
        });
    }

    // ─── Mark session expired when token expires ──────────────────────────────

    public void expireSessionByTokenId(String tokenId) {
        sessionRepository.findByTokenId(tokenId).ifPresent(s -> {
            s.setSessionStatus(UserSession.SessionStatus.EXPIRED.name());
            sessionRepository.save(s);
        });
    }

    // ─── Get suspicious sessions for admin view ───────────────────────────────

    public List<UserSessionDto> getSuspiciousSessions(String userId) {
        return sessionRepository.findByUserIdAndSuspiciousTrue(userId)
                .stream()
                .map(s -> UserSessionDto.from(s, false))
                .collect(Collectors.toList());
    }

    // ─── Retrieve token document by its stored id ─────────────────────────────

    public String getTokenIdFromJwt(String tokenValue) {
        return tokenRepository.findByToken(tokenValue)
                .map(Token::getId)
                .orElse(null);
    }
}
