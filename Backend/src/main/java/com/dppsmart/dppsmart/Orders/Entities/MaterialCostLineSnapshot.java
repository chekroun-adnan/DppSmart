package com.dppsmart.dppsmart.Orders.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MaterialCostLineSnapshot {
    private String materialId;
    private String materialName;
    private String unit;
    private Double quantityPerUnit;
    private Double wastePercentage;
    private Double unitPrice;
    private String costCurrency;
    private Double materialCostPerUnit;
    private Double materialCostTotal;
}
