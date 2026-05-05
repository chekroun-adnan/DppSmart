package com.dppsmart.dppsmart.Scan.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ScanEventResponseDto {
    private String id;
    private String productId;
    private String organizationId;
    private String scannedUrl;
    private LocalDateTime scannedAt;
    private String ip;
    private String userAgent;
    private String referer;
    private Double latitude;
    private Double longitude;
    private String locationText;
    private String scannedByUserEmail;
}

