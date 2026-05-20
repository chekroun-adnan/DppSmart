package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MaterialsBreakdownResult {
    private String orderId;
    private String orderReference;
    private boolean materialsReserved;
    private boolean allSufficient;
    private List<MaterialLine> materials;

    @Data
    @Builder
    public static class MaterialLine {
        private String materialId;
        private String materialName;
        private String unit;
        private double totalRequired;     // sum across all order items
        private int availableStock;       // current stock (unreserved)
        private int reservedStock;        // already reserved elsewhere
        private double willConsume;       // how much this order will consume in production
        private double remainingAfter;    // availableStock - willConsume
        private boolean sufficient;
        private double shortage;          // max(0, willConsume - availableStock)
        private boolean alreadyReservedForThisOrder;
    }
}
