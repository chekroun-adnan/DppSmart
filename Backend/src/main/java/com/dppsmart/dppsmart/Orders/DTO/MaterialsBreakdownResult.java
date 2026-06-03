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
        private double totalRequired;
        private int availableStock;
        private int reservedStock;
        private double willConsume;
        private double remainingAfter;
        private boolean sufficient;
        private double shortage;
        private boolean alreadyReservedForThisOrder;
    }
}
