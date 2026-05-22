package com.dppsmart.dppsmart.Allocation.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AllocationReviewResponseDTO {
    private String sessionId;
    private List<OrderCardDTO> orders;
    private GlobalStockSummaryDTO stockSummary;
    private List<String> warnings;
    private boolean canProceed;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderCardDTO {
        private String orderId;
        private String orderReference;
        private String clientName;
        private String organizationName;
        private LocalDate requestedDeliveryDate;
        private String status;
        private int priorityLevel;
        private List<ProductLineDTO> products;
        private int totalOrderedQuantity;
        private int totalAllocatedQuantity;
        private int totalRemainingToProduce;
        private ProductionReadinessDTO productionReadiness;
        private MaterialReadinessDTO materialReadiness;
        private String estimatedProductionTime;
        private boolean urgent;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductLineDTO {
        private String productId;
        private String productName;
        private int orderedQuantity;
        private int availableFinishedStock;
        private int allocatedQuantity;
        private int remainingToProduce;
        private String unit;
        private String status;
        // per-item producibility (live, independent of other orders)
        private int producibleQuantityNow;
        private String productionStatus;  // READY_FOR_PRODUCTION | PARTIALLY_PRODUCIBLE | MATERIALS_MISSING | NO_BOM
        private boolean canStartProduction;
        private List<MaterialLineDTO> itemMaterials;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductionReadinessDTO {
        private boolean hasBom;
        private boolean materialsAvailable;
        private boolean capacityAvailable;
        private int estimatedDurationMinutes;
        private String recommendedWorkstation;
        private List<String> issues;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MaterialReadinessDTO {
        private boolean allAvailable;
        private List<MaterialLineDTO> materials;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MaterialLineDTO {
        private String materialId;
        private String materialName;
        private double requiredQuantity;
        private double availableQuantity;
        private double reservedQuantity;
        private double missingQuantity;
        private String unit;
        private String status;
        private boolean enough;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PerOrderProductionStatusDTO {
        public enum ProductionStatus { READY_FOR_PRODUCTION, PARTIALLY_PRODUCIBLE, MATERIALS_MISSING }

        private String orderId;
        private String orderItemId;
        private String productName;
        private int orderedQuantity;
        private int remainingToProduce;
        private int producibleQuantityNow;
        private ProductionStatus productionStatus;
        private boolean canStartProduction;
        private List<MaterialLineDTO> materials;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GlobalStockSummaryDTO {
        private int totalAvailableStock;
        private int totalReservedStock;
        private int totalAllocatedInSession;
        private int remainingStockAfterAllocation;
    }
}
