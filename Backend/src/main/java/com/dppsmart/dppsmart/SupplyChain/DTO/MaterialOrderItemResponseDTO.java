package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class MaterialOrderItemResponseDTO {
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
