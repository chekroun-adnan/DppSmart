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

    // ─── Per-product stock analysis ────────────────────────────────────────────

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
        private int totalRequestedQuantity;  // sum across all selected orders
        private int availableProductStock;
        private int allocatedFromStock;      // min(totalRequested, availableStock)
        private int missingQuantityToProduce; // max(0, totalRequested - availableStock)
        private boolean stockSufficient;
        private String technicalSheetId;
        private String technicalSheetName;
        private String errorMessage;
        private List<AffectedOrderItem> affectedOrders;
    }

    // ─── Aggregated raw material requirements ─────────────────────────────────

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
        private double totalRequiredQuantity; // only for units needing production
        private int availableStock;
        private double remainingAfter;        // max(0, available - totalRequired)
        private double missingQuantity;       // max(0, totalRequired - available)
        private String status;               // "AVAILABLE" or "INSUFFICIENT"
        private double willConsumeIfChosen;
        private double availableBefore;
        private double availableAfterSimulation;
    }

    // ─── Root fields ──────────────────────────────────────────────────────────

    private List<String> selectedOrderIds;
    private List<ProductSummary> productSummaries;
    private List<MaterialRequirement> aggregatedMaterials;
    private boolean allStockSufficient;      // true = no production needed at all
    private boolean priorityAllocated;       // true = admin has set priorities
    private String aiSummary;
    private int totalOrdersProcessed;
    private int totalProductsNeedingProduction;
}
