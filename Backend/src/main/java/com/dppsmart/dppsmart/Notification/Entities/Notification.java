package com.dppsmart.dppsmart.Notification.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Data
public class Notification {
    @Id
    private String id;
    private String userId;
    private String title;
    private String message;
    private NotificationType type;
    private String link;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    private String deduplicationKey;

    public enum NotificationType {
        ORDER, DELIVERY, PRODUCTION, TASK, SYSTEM, ALERT, ALLOCATION, RESERVATION, CONFLICT, SECURITY
    }
}