package com.dppsmart.dppsmart.Orders.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderItemRequirementResponse {
    private String orderId;
    private String orderReference;
    private String orderItemIndex;      
    private String productId;
    private String productName;
    private Integer orderedQuantity;
    private Integer availableProductStock;
    private Integer reservedProductStock;
    private Integer missingProductQuantity;  
    private String technicalSheetId;
    private String technicalSheetName;
    private List<MaterialRequirementDTO> materialRequirements;
    private String aiSummary;
    private String errorMessage;        
}
