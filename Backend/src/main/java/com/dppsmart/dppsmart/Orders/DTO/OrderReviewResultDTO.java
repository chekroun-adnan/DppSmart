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
        // Sum of quantities demanded by all OTHER active orders for this product
        private int otherOrdersDemand;
        // availableStock - otherOrdersDemand  (stock effectively free for this order)
        private int effectiveAvailable;
        // max(0, orderedQuantity - effectiveAvailable)
        private int productionNeededQty;
        private boolean canFulfillFromStock;
    }

    private String orderId;
    private String orderReference;
    // true only when every item can be fulfilled from stock after accounting for competing orders
    private boolean canConfirmDirectly;
    private List<ItemReviewDTO> items;
}
