package com.dppsmart.dppsmart.MaterialStock.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MaterialStockResponseDTO {

    private String id;
    private String name;
    private String referenceCode;
    private Integer quantity;
    private Integer minimumThreshold;
    private String unit;
    private String organizationId;
    private String lastUpdatedBy;
    private LocalDateTime updatedAt;
    private Double unitPrice;
    private String costCurrency;
    private String supplier;
}
