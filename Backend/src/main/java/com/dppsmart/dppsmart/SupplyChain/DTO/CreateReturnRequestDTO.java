package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class CreateReturnRequestDTO {
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private Integer quantity;
    private String reason;
    private String notes;
}