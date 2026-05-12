package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class SupplierPerformanceDTO {
    private String supplierId;
    private int totalOrders;
    private int completedOrders;
    private int disputedOrders;
    private int onTimeDeliveries;
    private double reliabilityScore;
    private double qualityScore;
}