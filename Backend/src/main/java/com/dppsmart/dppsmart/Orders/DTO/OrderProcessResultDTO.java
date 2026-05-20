package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OrderProcessResultDTO {

    public enum Outcome {
        DELIVERED,           // all items in finished stock — deducted and ready
        PRODUCTION_STARTED,  // some/all items need production — materials sufficient
        SUPPLY_ORDER_CREATED // materials missing — auto supply chain order created, awaiting admin approval
    }

    private String orderId;
    private String orderReference;
    private Outcome outcome;
    private String message;

    // populated when outcome == DELIVERED
    private String deliveryToken;

    // populated when outcome == PRODUCTION_STARTED
    private List<String> productionIds;

    // populated when outcome == SUPPLY_ORDER_CREATED
    private String supplyOrderId;
    private String supplyOrderNumber;
    private List<MissingMaterialLine> missingMaterials;

    @Data
    @Builder
    public static class MissingMaterialLine {
        private String materialId;
        private String materialName;
        private String unit;
        private double requiredQuantity;
        private double availableQuantity;
        private double missingQuantity;
    }
}
