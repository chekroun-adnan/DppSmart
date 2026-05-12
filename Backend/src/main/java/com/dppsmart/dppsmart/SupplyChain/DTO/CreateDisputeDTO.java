package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class CreateDisputeDTO {
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private String type;
    private String description;
}