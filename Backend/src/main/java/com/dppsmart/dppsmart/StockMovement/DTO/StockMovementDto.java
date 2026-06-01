package com.dppsmart.dppsmart.StockMovement.DTO;

import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StockMovementDto {
    private String id;
    private MovementType movementType;
    private String productId;
    private String materialId;
    private String itemName;
    private String unit;
    private double quantity;
    private double beforeQuantity;
    private double afterQuantity;
    private String relatedOrderId;
    private String relatedProductionId;
    private String organizationId;
    private String createdBy;
    private LocalDateTime createdAt;
}
