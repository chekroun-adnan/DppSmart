package com.dppsmart.dppsmart.Billing.DTO;

import lombok.Data;

@Data
public class InvoiceLineItemDto {
    private String productId;
    private String productName;
    private String itemType;
    private Double quantity;
    private String unit;
    private Double unitPrice;
    private Double totalPrice;
    private String productionStepId;
    private Integer completedQuantity;
    private Double productionCost;
    private Double materialCost;
    private Double durationPerUnit;
    private Double costPerMinute;
    private Boolean clientSuppliedMaterials;
}
