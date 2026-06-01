package com.dppsmart.dppsmart.Scan.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ScanAlertDto {
    private String id;
    private String productId;
    private String productName;
    private int riskScore;
    private java.util.List<String> anomalyFlags;
    private boolean fakeProduct;
    private String scannedAt;
    private String ip;
    private String location;
}
