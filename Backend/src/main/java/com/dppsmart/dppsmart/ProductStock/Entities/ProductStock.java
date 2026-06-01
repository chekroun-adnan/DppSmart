package com.dppsmart.dppsmart.ProductStock.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "product_stock")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductStock {

    @Id
    private String id;
    private String productName;
    private String productId;
    private Integer quantity;
    private String unit;
    private String organizationId;
    private String createdBy;
    private String lastUpdatedBy;
    private LocalDateTime updatedAt;

    
    private String lastProductionId;
    private LocalDateTime lastProductionAt;
    private int totalProduced;
    private Integer inProductionQuantity;
    private Integer reservedQuantity;
}
