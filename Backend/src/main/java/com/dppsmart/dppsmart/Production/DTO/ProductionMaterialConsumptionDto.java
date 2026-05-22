package com.dppsmart.dppsmart.Production.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProductionMaterialConsumptionDto {
    private String productionId;
    private String productId;
    private String productName;
    private int quantityToProduce;
    private boolean technicalSheetFound;
    private String technicalSheetId;
    private String technicalSheetName;
    private boolean allMaterialsSufficient;
    private List<MaterialConsumptionLine> materials;

    @Data
    @Builder
    public static class MaterialConsumptionLine {
        private String materialId;
        private String materialName;
        private String referenceCode;
        private String unit;
        private double quantityPerUnit;
        private double totalNeeded;
        private int currentStock;
        private int reservedQuantity;
        private double remainingAfterProduction;
        private double shortage;
        private String status;
    }
}
