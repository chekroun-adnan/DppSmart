package com.dppsmart.dppsmart.StockMovement.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "stock_movements")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StockMovement {

    @Id
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
