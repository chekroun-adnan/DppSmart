package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class UpdateDisputeDTO {
    private String status;
    private String resolution;
    private String supplierResponse;
    private String message;
}