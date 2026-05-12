package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;

@Data
public class ProcurementAnalyticsDTO {
    private int totalOrders;
    private int totalAmount;
    private int totalQuantity;
    private int totalAccepted;
    private int totalRejected;
    private int totalReturned;
    private int pendingOrders;
    private int inTransitOrders;
    private int completedOrders;
    private int disputedOrders;
}