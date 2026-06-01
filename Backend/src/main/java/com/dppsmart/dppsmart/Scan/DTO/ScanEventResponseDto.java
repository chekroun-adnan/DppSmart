package com.dppsmart.dppsmart.Scan.DTO;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

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
    private String signature;
    private Boolean signatureValid;
    private Integer riskScore;
    private List<String> anomalyFlags;
    private Boolean fakeProduct;
    private String source;
}
