package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TrackingResponseDTO {
    private String id;
    private String materialOrderId;
    private Double currentLatitude;
    private Double currentLongitude;
    private String currentStatus;
    private LocalDateTime estimatedArrival;
    private LocalDateTime lastUpdatedAt;
}
