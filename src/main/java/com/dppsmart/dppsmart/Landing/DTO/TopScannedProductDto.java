package com.dppsmart.dppsmart.Landing.DTO;

import lombok.Data;

@Data
public class TopScannedProductDto {
    private String productId;
    private String productName;
    private String qrUrl;
    private String dppUrl;
    private long scanCount;
}

