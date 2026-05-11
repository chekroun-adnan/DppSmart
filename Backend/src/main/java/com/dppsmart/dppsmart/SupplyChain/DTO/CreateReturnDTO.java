package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReturnDTO {
    @NotBlank(message = "materialOrderId is required")
    private String materialOrderId;
    @NotBlank(message = "itemId is required")
    private String itemId;
    @NotNull(message = "returnQuantity is required")
    private Integer returnQuantity;
    @NotBlank(message = "rejectionReason is required")
    private String rejectionReason;
    private String notes;
}
