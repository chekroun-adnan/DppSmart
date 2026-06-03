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
public class OrderReviewResultDTO {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ItemReviewDTO {
        private String productId;
        private String productName;
        private int orderedQuantity;
        private int availableStock;

        private int otherOrdersDemand;

        private int effectiveAvailable;

        private int productionNeededQty;
        private boolean canFulfillFromStock;
    }

    private String orderId;
    private String orderReference;

    private boolean canConfirmDirectly;
    private List<ItemReviewDTO> items;
}
