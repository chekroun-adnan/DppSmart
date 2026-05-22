package com.dppsmart.dppsmart.Notification.Controllers;

import com.dppsmart.dppsmart.Notification.DTO.NotificationDto;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Repositories.NotificationRepository;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationServiceImpl notificationService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        String email = auth.getName();
        return userRepository.findByEmail(email).map(u -> u.getId()).orElse(null);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationDto>> getMyNotifications(
            @RequestParam(required = false) String userId) {
        String id = userId != null ? userId : getCurrentUserId();
        return ResponseEntity.ok(notificationService.getUserNotifications(id));
    }

    @GetMapping("/unread")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationDto>> getUnread(
            @RequestParam(required = false) String userId) {
        String id = userId != null ? userId : getCurrentUserId();
        return ResponseEntity.ok(notificationService.getUnreadNotifications(id));
    }

    @GetMapping("/unread/count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestParam(required = false) String userId) {
        String id = userId != null ? userId : getCurrentUserId();
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(id)));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationDto> markAsRead(@PathVariable String id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllAsRead() {
        String userId = getCurrentUserId();
        if (userId != null) {
            notificationService.markAllAsRead(userId);
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cleanup-low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> cleanupLowStockNotifications() {
        List<Notification> allAlerts = notificationRepository.findAll();
        int total = allAlerts.size();

        List<Notification> toDelete = allAlerts.stream()
                .filter(n -> n.getTitle() != null
                        && (n.getTitle().contains("Low Raw Material") || n.getTitle().contains("Low Finished Stock"))
                        && n.getDeduplicationKey() == null)
                .toList();

        notificationRepository.deleteAll(toDelete);

        long remaining = notificationRepository.count();
        return ResponseEntity.ok(Map.of(
                "deleted", toDelete.size(),
                "totalBefore", total,
                "totalAfter", remaining,
                "message", "Old low-stock notifications (without dedup keys) cleaned up."
        ));
    }
}