package com.dppsmart.dppsmart.Orders.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class OrderAvailabilityCheckDTO {

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class ProductAvailability {
        private String productId;
        private String productName;
        private int orderedQuantity;
        private int availableFinishedStock;
        private int quantityFromStock;
        private int quantityToProduce;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class MissingMaterial {
        private String materialId;
        private String materialName;
        private String unit;
        private double requiredQuantity;
        private double availableQuantity;
        private double missingQuantity;
    }

    private String orderId;
    private String orderReference;
    private boolean fullyAvailableFromStock;
    private boolean needsProduction;
    private boolean rawMaterialsEnough;
    private List<ProductAvailability> products;
    private List<MissingMaterial> missingMaterials;
}
