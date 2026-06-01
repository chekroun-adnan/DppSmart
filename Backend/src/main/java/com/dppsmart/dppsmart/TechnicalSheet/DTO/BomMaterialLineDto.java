package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BomMaterialLineDto {
    private String materialId;
    private String materialName;
    private String unit;
    private double quantityPerUnit;
    private Double wastePercentage;
    private double requiredQuantity;
    private int availableQuantity;
    private double missingQuantity;
    private boolean sufficient;
}
