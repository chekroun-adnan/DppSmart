package com.dppsmart.dppsmart.Notification.DTO;

import com.dppsmart.dppsmart.Notification.Entities.Notification;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationDto {
    private String id;
    private String title;
    private String message;
    private String type;
    private String link;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private String deduplicationKey;

    public static NotificationDto fromEntity(Notification n) {
        NotificationDto dto = new NotificationDto();
        dto.setId(n.getId());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setType(n.getType() != null ? n.getType().name() : "SYSTEM");
        dto.setLink(n.getLink());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setReadAt(n.getReadAt());
        dto.setDeduplicationKey(n.getDeduplicationKey());
        return dto;
    }
}