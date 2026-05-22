package com.dppsmart.dppsmart.Allocation.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SimulationImpactDTO {
    private StockImpactDTO stockBefore;
    private StockImpactDTO stockAfter;
    private List<ReservationChangeDTO> reservationChanges;
    private List<MaterialConsumptionDTO> materialConsumption;
    private ProductionWorkloadImpactDTO productionWorkload;
    private List<AffectedOrderDTO> affectedOrders;
    private List<ShortageDTO> shortages;
    private List<RiskDTO> risks;
    private boolean canProceed;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StockImpactDTO {
        private Map<String, Integer> productStockLevels;
        private Map<String, Integer> materialStockLevels;
        private int totalProductsAvailable;
        private int totalMaterialsAvailable;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ReservationChangeDTO {
        private String productId;
        private String productName;
        private int previouslyReserved;
        private int newlyReserved;
        private int totalReservedAfter;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MaterialConsumptionDTO {
        private String materialId;
        private String materialName;
        private double availableQuantity;
        private double requiredQuantity;
        private double remainingAfterConsumption;
        private boolean sufficient;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductionWorkloadImpactDTO {
        private int totalUnitsToProduce;
        private int estimatedTotalDurationMinutes;
        private int availableWorkstations;
        private int currentQueueLength;
        private int newQueueEntries;
        private LocalDate estimatedEarliestStart;
        private LocalDate estimatedLatestCompletion;
        private boolean capacitySufficient;
        private List<String> overloadedWorkstations;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AffectedOrderDTO {
        private String orderId;
        private String orderReference;
        private String previousStatus;
        private String newStatus;
        private int allocatedFromStock;
        private int toProduce;
        private LocalDate estimatedCompletionDate;
        private boolean onTrack;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ShortageDTO {
        private String materialId;
        private String materialName;
        private double requiredQuantity;
        private double availableQuantity;
        private double shortageQuantity;
        private String unit;
        private List<String> suggestedSuppliers;
        private int estimatedLeadDays;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RiskDTO {
        private String type;
        private String severity;
        private String message;
        private String affectedEntity;
    }
}
