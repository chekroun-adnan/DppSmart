package com.dppsmart.dppsmart.Security.Session;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "user_sessions")
@Data
public class UserSession {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String tokenId;   // maps to Token._id for revocation

    private String accessToken;  // stored hashed prefix for display only
    private String deviceName;
    private String browser;
    private String os;
    private String ipAddress;
    private String userAgent;
    private String country;
    private String city;
    private String sessionStatus; // ACTIVE, REVOKED, EXPIRED
    private boolean suspicious;
    private String suspicionReason;

    private LocalDateTime loginTime;
    private LocalDateTime lastActivity;
    private LocalDateTime expiresAt;

    public enum SessionStatus {
        ACTIVE, REVOKED, EXPIRED
    }
}
