package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class UpdateReturnRequestDTO {
    private String status;
    private String supplierResponse;
    private String notes;
    private String returnTrackingNumber;
    private String carrier;
}