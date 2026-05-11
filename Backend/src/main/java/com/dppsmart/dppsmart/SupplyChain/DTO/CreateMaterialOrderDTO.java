package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class CreateMaterialOrderDTO {
    @NotBlank(message = "supplierId is required")
    private String supplierId;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
    private String expectedDeliveryDate;
    private String notes;
    @NotNull(message = "items are required")
    @Size(min = 1, message = "at least one item is required")
    private List<OrderItemDTO> items;

    @Data
    public static class OrderItemDTO {
        @NotBlank(message = "materialId is required")
        private String materialId;
        @NotBlank(message = "materialName is required")
        private String materialName;
        private String materialReference;
        @NotNull(message = "orderedQuantity is required")
        private Integer orderedQuantity;
        private String unit;
        private String notes;
    }
}
