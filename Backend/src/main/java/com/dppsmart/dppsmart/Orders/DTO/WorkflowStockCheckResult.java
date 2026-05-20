package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Services.MaterialRequirementInfo;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WorkflowStockCheckResult {
    private String orderId;
    private String orderReference;
    private boolean allAvailable;
    private boolean anyAvailable;
    private String recommendation;
    private List<ItemStockInfo> items;

    @Data
    @Builder
    public static class ItemStockInfo {
        private String productId;
        private String productName;
        private int requiredQuantity;
        private int availableStock;
        private int allocatedQuantity;
        private int missingQuantity;
        private boolean materialsAvailable;
        private List<MaterialRequirementInfo> materialRequirements;
    }
}
