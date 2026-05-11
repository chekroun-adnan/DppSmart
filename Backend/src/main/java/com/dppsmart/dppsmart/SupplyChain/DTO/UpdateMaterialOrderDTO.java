package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class UpdateMaterialOrderDTO {
    @NotBlank(message = "id is required")
    private String id;
    private String expectedDeliveryDate;
    private String notes;
    private String status;
    private List<OrderItemDTO> items;

    @Data
    public static class OrderItemDTO {
        private String id;
        private String materialId;
        private String materialName;
        private String materialReference;
        private Integer orderedQuantity;
        private Integer approvedQuantity;
        private Integer rejectedQuantity;
        private String unit;
        private String conditionStatus;
        private String notes;
    }
}
