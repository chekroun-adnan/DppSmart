package com.dppsmart.dppsmart.Orders.Entities;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomMaterialLineDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderItem {
    private String productId;
    private String productName;
    private Integer quantity;
    private String unit;
    private Integer availableStock;
    private String estimatedProductionTime;
    private OrderItemStatus status;

    
    private String technicalSheetId;
    private Integer technicalSheetVersion;
    private List<BomMaterialLineDto> requiredMaterials;
    private boolean materialsAvailable;

    // Cost snapshots at order time (frozen — not recalculated on price changes)
    private Double materialCostPerUnit;
    private Double operationCostPerUnit;
    private Double unitManufacturingCost;
    private Double materialCostTotal;
    private Double operationCostTotal;
    private String costCurrency;
    private List<MaterialCostLineSnapshot> materialCostLines;
    private List<OperationCostLineSnapshot> operationCostLines;

    private Integer allocatedQuantity;
    private Integer missingQuantity;
    private String relatedProductionId;
    private String estimatedDeliveryDate;
    private boolean reserved;
}
