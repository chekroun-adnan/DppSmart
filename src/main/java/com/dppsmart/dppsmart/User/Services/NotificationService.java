package com.dppsmart.dppsmart.User.Services;

import com.dppsmart.dppsmart.Config.N8nConfig;
import com.dppsmart.dppsmart.User.Entities.User;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

    private final RestTemplate restTemplate;
    private final N8nConfig n8nConfig;

    public NotificationService(N8nConfig n8nConfig) {
        this.restTemplate = new RestTemplate();
        this.n8nConfig = n8nConfig;
    }

    // 🔹 Generic sender (reusable 🔥)
    @Async
    public void sendEvent(String url, Map<String, Object> payload) {
        try {
            restTemplate.postForObject(url, payload, String.class);
        } catch (Exception e) {
            System.out.println("❌ Notification failed: " + e.getMessage());
        }
    }

    // 🔹 USER REGISTERED
    @Async
    public void sendUserRegistered(User user) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", user.getEmail());
        payload.put("name", user.getName());
        payload.put("event", "USER_REGISTERED");
        payload.put("timestamp", System.currentTimeMillis());

        sendEvent(n8nConfig.getUserWebhook(), payload);
    }

    // 🔹 LOGIN ALERT
    @Async
    public void sendLoginAlert(User user, String ip, String userAgent) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", user.getEmail());
        payload.put("event", "LOGIN");
        payload.put("ip", ip);
        payload.put("device", userAgent);
        payload.put("timestamp", System.currentTimeMillis());

        sendEvent(n8nConfig.getLoginWebhook(), payload);
    }
}
