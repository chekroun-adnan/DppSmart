package com.dppsmart.dppsmart.Security.RateLimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.rate-limit")
@Getter
@Setter
public class RateLimitConfig {

    private int authRequests = 10;
    private int authWindowSeconds = 60;

    private int publicRequests = 30;
    private int publicWindowSeconds = 60;

    private int aiRequests = 20;
    private int aiWindowSeconds = 60;
}
