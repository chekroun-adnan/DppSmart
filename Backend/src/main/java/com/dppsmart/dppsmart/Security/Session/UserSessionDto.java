package com.dppsmart.dppsmart.Security.Session;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserSessionDto {

    private String id;
    private String deviceName;
    private String browser;
    private String os;
    private String ipAddress;
    private String country;
    private String city;
    private String sessionStatus;
    private boolean suspicious;
    private String suspicionReason;
    private boolean current;
    private LocalDateTime loginTime;
    private LocalDateTime lastActivity;
    private LocalDateTime expiresAt;

    public static UserSessionDto from(UserSession s, boolean isCurrent) {
        return UserSessionDto.builder()
                .id(s.getId())
                .deviceName(s.getDeviceName())
                .browser(s.getBrowser())
                .os(s.getOs())
                .ipAddress(s.getIpAddress())
                .country(s.getCountry())
                .city(s.getCity())
                .sessionStatus(s.getSessionStatus())
                .suspicious(s.isSuspicious())
                .suspicionReason(s.getSuspicionReason())
                .current(isCurrent)
                .loginTime(s.getLoginTime())
                .lastActivity(s.getLastActivity())
                .expiresAt(s.getExpiresAt())
                .build();
    }
}
