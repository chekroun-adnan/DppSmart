package com.dppsmart.dppsmart.Notification.Services;

import com.dppsmart.dppsmart.Notification.DTO.NotificationDto;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Repositories.NotificationRepository;
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
public class NotificationServiceImpl {

    private final NotificationRepository notificationRepository;
    private final NotificationEventService eventService;

    public List<NotificationDto> getUserNotifications(String userId) {
        if (userId == null || userId.isBlank()) return List.of();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(NotificationDto::fromEntity).collect(Collectors.toList());
    }

    public List<NotificationDto> getUnreadNotifications(String userId) {
        if (userId == null || userId.isBlank()) return List.of();
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .stream().map(NotificationDto::fromEntity).collect(Collectors.toList());
    }

    public long getUnreadCount(String userId) {
        if (userId == null || userId.isBlank()) return 0;
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public NotificationDto markAsRead(String id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        n.setRead(true);
        n.setReadAt(LocalDateTime.now());
        return NotificationDto.fromEntity(notificationRepository.save(n));
    }

    public void markAllAsRead(String userId) {
        if (userId == null || userId.isBlank()) return;
        List<Notification> unread = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
        });
        notificationRepository.saveAll(unread);
    }

    public void createNotification(String userId, String title, String message,
                                   Notification.NotificationType type, String link) {
        if (userId == null || userId.isBlank()) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(n);

        NotificationDto dto = NotificationDto.fromEntity(n);
        try {
            eventService.notifyUser(userId, dto);
        } catch (Exception e) {
            log.warn("WebSocket broadcast failed (non-critical): {}", e.getMessage());
        }
    }

    public void deleteNotification(String id) {
        notificationRepository.deleteById(id);
    }

    @Async
    public void notifyOrderUpdate(String userId, String orderId, String status) {
        if (userId == null || userId.isBlank()) return;
        createNotification(userId, "Order Updated",
                "Order " + orderId + " is now " + status,
                Notification.NotificationType.ORDER,
                "/orders/" + orderId);
    }

    @Async
    public void notifyProductionUpdate(String userId, String batchId, String status) {
        if (userId == null || userId.isBlank()) return;
        createNotification(userId, "Production Update",
                "Batch " + batchId + " is now " + status,
                Notification.NotificationType.PRODUCTION,
                "/production/" + batchId);
    }

    @Async
    public void notifyTaskAssigned(String userId, String taskId, String taskName) {
        if (userId == null || userId.isBlank()) return;
        createNotification(userId, "Task Assigned",
                "New task: " + taskName,
                Notification.NotificationType.TASK,
                "/tasks/" + taskId);
    }
}