package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class CreateMaterialOrderDTO {
    private String supplierId;
    private String organizationId;
    private String expectedDeliveryDate;
    private String notes;
    private List<CreateMaterialOrderItemDTO> items;

    @Data
    public static class CreateMaterialOrderItemDTO {
        private String materialId;
        private String materialName;
        private String materialReference;
        private Integer orderedQuantity;
        private Integer unitPrice;
        private String unit;
        private String notes;
    }
}