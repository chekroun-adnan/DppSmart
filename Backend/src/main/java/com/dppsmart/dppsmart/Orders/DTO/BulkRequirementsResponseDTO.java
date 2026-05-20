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
public class BulkRequirementsResponseDTO {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AggregatedMaterialDTO {
        private String materialId;
        private String materialName;
        private String referenceCode;
        private String unit;
        private Double totalRequiredQuantity;
        private Integer availableStock;
        private Double remainingAfter;   
        private Double missingQuantity;  
        private String status;           
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderSummaryDTO {
        private String orderId;
        private String orderReference;
        private String productName;
        private Integer orderedQuantity;
        private Integer missingProductQuantity;
        private String errorMessage;
    }

    private List<String> orderIds;
    private List<OrderSummaryDTO> orderSummaries;
    private List<AggregatedMaterialDTO> aggregatedMaterials;
    private int totalOrdersProcessed;
    private int totalItemsWithRequirements;
}
