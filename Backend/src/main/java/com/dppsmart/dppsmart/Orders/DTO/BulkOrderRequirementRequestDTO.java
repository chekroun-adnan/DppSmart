package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkOrderRequirementRequestDTO {

    /** Order IDs to include in the analysis */
    private List<String> orderIds;

    /** Optional: admin-set priority allocation per product.
     *  When present, drives the recalculate path. */
    private List<ProductPriorityAllocation> priorityAllocations;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductPriorityAllocation {
        private String productId;
        /** Ordered list of orderId → allocatedFromStock for this product */
        private List<OrderAllocation> allocations;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderAllocation {
        private String orderId;
        private int allocatedFromStock;
    }
}
