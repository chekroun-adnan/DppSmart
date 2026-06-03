package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OrderProcessResultDTO {

    public enum Outcome {
        DELIVERED,
        PRODUCTION_STARTED,
        SUPPLY_ORDER_CREATED
    }

    private String orderId;
    private String orderReference;
    private Outcome outcome;
    private String message;

    private String deliveryToken;

    private List<String> productionIds;

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
