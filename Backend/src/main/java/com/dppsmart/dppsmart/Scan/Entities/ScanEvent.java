package com.dppsmart.dppsmart.Scan.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "scan_events")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScanEvent {
    @Id
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

