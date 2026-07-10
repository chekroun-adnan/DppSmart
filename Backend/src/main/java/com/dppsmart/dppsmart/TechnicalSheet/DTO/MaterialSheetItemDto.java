package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class MaterialSheetItemDto {
    private String id;
    @NotBlank
    private String materialId;
    @Positive
    private Double quantityPerUnit;
    private String unit;
    private Double wastePercentage;
    private String notes;
    
    private String materialName;
    private String materialReference;
    private Integer availableStock;
    private Double unitPrice;
    private String costCurrency;
    private Double materialCostPerUnit;
}
