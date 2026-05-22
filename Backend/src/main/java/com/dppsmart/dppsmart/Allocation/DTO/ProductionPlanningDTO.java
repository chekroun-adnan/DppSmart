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
public class ProductionPlanningDTO {

    private List<OrderPlanDTO> orders;
    private GlobalMaterialSummaryDTO globalSummary;
    private AiRecommendationDTO aiRecommendation;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderPlanDTO {
        private String orderId;
        private String orderCode;
        private String clientEmail;
        private String status;
        private LocalDate requestedDeliveryDate;
        private LocalDate confirmedDeliveryDate;
        private boolean deliveryDateConfirmed;
        private List<ItemPlanDTO> items;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ItemPlanDTO {
        private String orderItemId;
        private String productName;
        private int orderedQuantity;
        private int finishedStockAvailable;
        private int remainingToProduce;
        private int producibleQuantityNow;
        private int simulationOrderIndex;
        private boolean blockedByPreviousOrders;
        private String productionStatus;
        private boolean canStartProduction;
        private String simulationMessage;
        private List<MaterialSimDTO> materials;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MaterialSimDTO {
        private String materialName;
        private String unit;
        private String materialId;
        private double materialPerProduct;
        private int availableInStock;
        private double neededForFullOrder;
        private double willConsumeIfChosen;
        private double missingAfterThisProduction;
        private double availableBefore;
        private double availableAfterSimulation;
        private boolean enoughForFullOrder;
        private boolean limitingMaterial;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GlobalMaterialSummaryDTO {
        private List<GlobalMatLineDTO> materials;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GlobalMatLineDTO {
        private String materialName;
        private String unit;
        private double totalRequired;
        private double available;
        private double missing;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AiRecommendationDTO {
        private String recommendedOrderId;
        private String recommendedOrderCode;
        private String recommendation;
        private String reason;
        private String risk;
        private String priority;
    }
}
