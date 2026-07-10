package com.dppsmart.dppsmart.Orders.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OperationCostLineSnapshot {
    private String operationId;
    private String operationName;
    private String department;
    private Double durationPerUnit;
    private String durationUnit;
    private Double costPerMinute;
    private Double costPerUnit;
    /** Total minutes required for the order line: durationPerUnit × order quantity. */
    private Double requiredTimeMinutes;
    private String costCurrency;
    private Double operationCostTotal;
}
