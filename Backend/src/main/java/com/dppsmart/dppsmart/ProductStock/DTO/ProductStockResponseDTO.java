package com.dppsmart.dppsmart.ProductStock.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProductStockResponseDTO {

    private String id;
    private String productName;
    private String productId;
    private Integer quantity;
    private String unit;
    private String organizationId;
    private String lastUpdatedBy;
    private LocalDateTime updatedAt;

    private String lastProductionId;
    private LocalDateTime lastProductionAt;
    private int totalProduced;
    private Integer reservedQuantity;
}
