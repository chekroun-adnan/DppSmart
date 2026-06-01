package com.dppsmart.dppsmart.Scan.DTO;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateScanEventDto {

    @NotBlank(message = "productId is required")
    @Size(max = 50, message = "productId must be 50 characters or fewer")
    private String productId;

    @DecimalMin(value = "-90.0", message = "latitude must be between -90 and 90")
    @DecimalMax(value = "90.0",  message = "latitude must be between -90 and 90")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "longitude must be between -180 and 180")
    @DecimalMax(value = "180.0",  message = "longitude must be between -180 and 180")
    private Double longitude;

    @Size(max = 500, message = "locationText must be 500 characters or fewer")
    private String locationText;

    @Size(max = 2048, message = "signature must be 2048 characters or fewer")
    private String signature;
}
