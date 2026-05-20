package com.dppsmart.dppsmart.Orders.Services;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MaterialRequirementInfo {
    private String materialId;
    private String materialName;
    private String unit;
    private double requiredQuantity;
    private double availableQuantity;
    private double missingQuantity;
}
