package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTrackingDTO {
    @NotBlank(message = "materialOrderId is required")
    private String materialOrderId;
    private Double currentLatitude;
    private Double currentLongitude;
    private String currentStatus;
    private String estimatedArrival;
}
