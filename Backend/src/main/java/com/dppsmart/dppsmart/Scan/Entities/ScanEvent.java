package com.dppsmart.dppsmart.Scan.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "scan_events")
@CompoundIndex(name = "product_ip_time", def = "{'productId':1, 'ip':1, 'scannedAt':-1}")
@CompoundIndex(name = "org_risk", def = "{'organizationId':1, 'riskScore':-1}")
@CompoundIndex(name = "ip_time", def = "{'ip':1, 'scannedAt':-1}")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScanEvent {

    @Id
    private String id;

    @Indexed
    private String productId;
    @Indexed
    private String organizationId;

    private String scannedUrl;

    @Indexed
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
