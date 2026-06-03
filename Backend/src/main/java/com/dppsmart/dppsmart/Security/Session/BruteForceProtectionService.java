package com.dppsmart.dppsmart.Security.Session;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class BruteForceProtectionService {

    private static final int  MAX_ATTEMPTS_PER_EMAIL   = 5;
    private static final long EMAIL_WINDOW_MINUTES      = 15;
    private static final long EMAIL_LOCKOUT_MINUTES     = 30;

    private static final int  MAX_ATTEMPTS_PER_IP      = 20;
    private static final long IP_WINDOW_MINUTES         = 15;

    private final LoginAttemptRepository loginAttemptRepository;
    private final UserRepository userRepository;
    private final NotificationServiceImpl notificationService;
    private final SecurityAnalysisService securityAnalysisService;
    private final RuleDetectionService ruleDetectionService;

    public void checkLoginAllowed(String email, String ip) {
        LocalDateTime emailWindow = LocalDateTime.now().minusMinutes(EMAIL_WINDOW_MINUTES);
        long emailFailures = loginAttemptRepository
                .countByEmailAndSuccessFalseAndAttemptTimeAfter(email, emailWindow);

        if (emailFailures >= MAX_ATTEMPTS_PER_EMAIL) {
            log.warn("Brute force lockout triggered for email: {}", email);
            notifyAdminIfNeeded(email, ip, emailFailures);
            throw new BadRequestException(
                    "Too many failed login attempts. Account temporarily locked. Try again in "
                            + EMAIL_LOCKOUT_MINUTES + " minutes.");
        }

        LocalDateTime ipWindow = LocalDateTime.now().minusMinutes(IP_WINDOW_MINUTES);
        long ipFailures = loginAttemptRepository
                .countByIpAddressAndSuccessFalseAndAttemptTimeAfter(ip, ipWindow);

        if (ipFailures >= MAX_ATTEMPTS_PER_IP) {
            log.warn("Brute force lockout triggered for IP: {}", ip);
            throw new BadRequestException(
                    "Too many requests from your IP address. Please wait before trying again.");
        }
    }

    public void recordSuccess(String email, HttpServletRequest request) {
        record(email, request, true, null);
    }

    public void recordFailure(String email, HttpServletRequest request, String reason) {
        record(email, request, false, reason);

        String ip = DeviceParser.extractIp(request);
        LocalDateTime window = LocalDateTime.now().minusMinutes(EMAIL_WINDOW_MINUTES);
        long failures = loginAttemptRepository
                .countByEmailAndSuccessFalseAndAttemptTimeAfter(email, window);

        if (failures == 3 || failures == MAX_ATTEMPTS_PER_EMAIL) {
            notifyUserAboutFailedAttempts(email, ip, failures);
        }

        if (failures >= 5) {
            var ruleAlert = ruleDetectionService.detectAuthAnomaly(email, ip, (int) failures, null, null);
            if (ruleAlert != null) {
                securityAnalysisService.analyzeAndAlert(ruleAlert);
            }
        }
    }

    private void record(String email, HttpServletRequest request,
                        boolean success, String failureReason) {
        String ua = request.getHeader("User-Agent");
        String ip = DeviceParser.extractIp(request);

        LoginAttempt attempt = new LoginAttempt();
        attempt.setId(NanoIdUtils.randomNanoId());
        attempt.setEmail(email);
        attempt.setIpAddress(ip);
        attempt.setSuccess(success);
        attempt.setFailureReason(failureReason);
        attempt.setUserAgent(ua);
        attempt.setBrowser(DeviceParser.extractBrowser(ua));
        attempt.setOs(DeviceParser.extractOs(ua));
        attempt.setAttemptTime(LocalDateTime.now());
        loginAttemptRepository.save(attempt);
    }

    public long getRecentFailures(String email) {
        LocalDateTime window = LocalDateTime.now().minusMinutes(EMAIL_WINDOW_MINUTES);
        return loginAttemptRepository
                .countByEmailAndSuccessFalseAndAttemptTimeAfter(email, window);
    }

    private void notifyUserAboutFailedAttempts(String email, String ip, long count) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String msg = count >= MAX_ATTEMPTS_PER_EMAIL
                    ? "Your account has been temporarily locked due to " + count
                        + " failed login attempts from IP " + ip + ". If this wasn't you, consider changing your password."
                    : count + " failed login attempts detected from IP " + ip
                        + ". If this wasn't you, your account may be under attack.";
            try {
                notificationService.createNotification(
                        user.getId(),
                        count >= MAX_ATTEMPTS_PER_EMAIL ? "Account Temporarily Locked" : "Failed Login Attempts Detected",
                        msg,
                        Notification.NotificationType.ALERT,
                        "/security"
                );
            } catch (Exception e) {
                log.warn("Could not send brute force alert to user {}: {}", email, e.getMessage());
            }
        });
    }

    private void notifyAdminIfNeeded(String email, String ip, long count) {

        log.warn("SECURITY: Account {} locked after {} failures from IP {}", email, count, ip);
    }
}
