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
public class BulkOrderRequirementResponseDTO {


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public static class AffectedOrderItem {
    private String orderId;
    private String orderReference;
    private int orderedQuantity;
    private int allocatedFromStock;
    private int quantityToProduce;
    private int priority;
    private String status;
    private List<MaterialRequirement> materialRequirements;
    private String productionStatus;
    private int producibleQuantityNow;
    private boolean canStartProduction;
}

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductSummary {
        private String productId;
        private String productName;
        private int totalRequestedQuantity;
        private int availableProductStock;
        private int allocatedFromStock;
        private int missingQuantityToProduce;
        private boolean stockSufficient;
        private String technicalSheetId;
        private String technicalSheetName;
        private String errorMessage;
        private List<AffectedOrderItem> affectedOrders;
    }


    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MaterialRequirement {
        private String materialId;
        private String materialName;
        private String referenceCode;
        private String unit;
        private double quantityPerUnit;
        private double totalRequiredQuantity;
        private int availableStock;
        private double remainingAfter;
        private double missingQuantity;
        private String status;
        private double willConsumeIfChosen;
        private double availableBefore;
        private double availableAfterSimulation;
    }


    private List<String> selectedOrderIds;
    private List<ProductSummary> productSummaries;
    private List<MaterialRequirement> aggregatedMaterials;
    private boolean allStockSufficient;
    private boolean priorityAllocated;
    private String aiSummary;
    private int totalOrdersProcessed;
    private int totalProductsNeedingProduction;
}
