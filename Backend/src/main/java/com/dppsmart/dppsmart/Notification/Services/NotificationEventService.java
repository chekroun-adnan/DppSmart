package com.dppsmart.dppsmart.Notification.Services;

import com.dppsmart.dppsmart.Notification.DTO.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationEventService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastToUser(String userId, NotificationDto notification) {
        messagingTemplate.convertAndSend("/queue/notifications/" + userId, notification);
    }

    public void broadcastToTopic(String topic, Object message) {
        messagingTemplate.convertAndSend("/topic/" + topic, message);
    }

    public void notifyUser(String userId, NotificationDto notification) {
        broadcastToUser(userId, notification);
    }

    public void broadcastNewNotification(NotificationDto notification) {
        broadcastToTopic("new-notification", notification);
    }
}