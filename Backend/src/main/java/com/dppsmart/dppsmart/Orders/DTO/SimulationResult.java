package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Services.MaterialRequirementInfo;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SimulationResult {
    private String orderId;
    private String orderReference;
    private String outcome;
    private String message;
    private boolean allInStock;
    private boolean allMaterialsAvailable;
    private String estimatedDeliveryDate;
    private List<ItemSimulation> items;
    private List<MaterialRequirementInfo> consolidatedMaterials;

    @Data
    @Builder
    public static class ItemSimulation {
        private String productId;
        private String productName;
        private int requiredQuantity;
        private int availableInStock;
        private int toProduce;
        private List<MaterialRequirementInfo> materialRequirements;
    }
}
