package com.dppsmart.dppsmart.SupplyChain.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialOrderItem {
    private String id;
    private String materialId;
    private String materialName;
    private String materialReference;
    private Integer orderedQuantity;
    private Integer receivedQuantity;
    private Integer acceptedQuantity;
    private Integer rejectedQuantity;
    private Integer returnedQuantity;
    private Integer unitPrice;
    private String unit;
    private String conditionStatus;
    private String notes;
    private Integer remainingQuantity;
}