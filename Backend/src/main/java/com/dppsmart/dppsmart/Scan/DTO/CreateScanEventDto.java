package com.dppsmart.dppsmart.Scan.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateScanEventDto {
    @NotBlank(message = "productId is required")
    private String productId;

    private Double latitude;
    private Double longitude;
    private String locationText;
}

