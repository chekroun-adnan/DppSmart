package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkOrderRequirementRequestDTO {

    
    private List<String> orderIds;

    
    private List<ProductPriorityAllocation> priorityAllocations;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductPriorityAllocation {
        private String productId;
        
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
