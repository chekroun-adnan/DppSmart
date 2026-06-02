package com.dppsmart.dppsmart.Orders.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SequentialAllocationResponse {

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class MaterialAllocation {
        private String materialId;
        private String materialName;
        private String unit;
        private double requiredQuantity;
        private double availableBefore;
        private double allocatedQuantity;
        private double remainingAfter;
        private double missingQuantity;
        private String allocationSource;
        private String productId;
        private String productName;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class OrderAllocation {
        private String orderId;
        private String orderReference;
        private String organizationName;
        private String deliveryDate;
        private String priorityLevel;
        private int priorityRank;
        private String allocationStatus;
        private String readinessStatus;
        private boolean canSendToDelivery;
        private boolean canStartProduction;
        private boolean canStartPartialProduction;
        private List<String> missingMaterials;
        private List<String> missingProducts;
        private List<MaterialAllocation> materials;
        private String warningMessage;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class GlobalMaterialLine {
        private String materialId;
        private String materialName;
        private String unit;
        private double initialStock;
        private double totalRequired;
        private double totalAllocated;
        private double totalMissing;
        private double finalRemainingStock;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class SimulationSummary {
        private Map<String, Double> initialStock;
        private double totalRequired;
        private double totalAllocated;
        private double totalMissing;
        private Map<String, Double> finalRemainingStock;
    }

    private List<OrderAllocation> orders;
    private List<GlobalMaterialLine> materialSummary;
    private SimulationSummary simulationSummary;
}
