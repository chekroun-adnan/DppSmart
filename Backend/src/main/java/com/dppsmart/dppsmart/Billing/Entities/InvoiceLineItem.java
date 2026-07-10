package com.dppsmart.dppsmart.Billing.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceLineItem {
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
    /** Minutes per product unit (production lines only). */
    private Double durationPerUnit;
    /** Operation rate from master operation at snapshot time (production lines only). */
    private Double costPerMinute;
    private Boolean clientSuppliedMaterials;
}
