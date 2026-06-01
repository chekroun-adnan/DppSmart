package com.dppsmart.dppsmart.PurchaseRequest.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequestItem {
    private String materialId;
    private String materialName;
    private String unit;
    private double requiredQuantity;
    private int availableQuantity;
    private double missingQuantity;
    private boolean fulfilled;
}
