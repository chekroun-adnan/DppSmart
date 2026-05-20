package com.dppsmart.dppsmart.Orders.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MaterialRequirementDTO {
    private String materialId;
    private String materialName;
    private String referenceCode;
    private String unit;
    private Double quantityPerUnit;
    private Double requiredQuantity;
    private Integer availableStock;
    private Integer reservedQuantity;
    private Double otherOrdersShortfall;  
    private Double missingQuantity;       
    private Double recommendedOrderQuantity; 
    private String status;               
}
