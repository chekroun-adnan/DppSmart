package com.dppsmart.dppsmart.Security.Session;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "login_attempts")
@Data
public class LoginAttempt {

    @Id
    private String id;

    @Indexed
    private String email;

    @Indexed
    private String ipAddress;

    private boolean success;
    private String failureReason;
    private String userAgent;
    private String browser;
    private String os;

    @Indexed(expireAfterSeconds = 86400)
    private LocalDateTime attemptTime;
}
