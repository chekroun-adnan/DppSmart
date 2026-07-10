package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Services.ProductionSchedulingService;
import lombok.Data;

import java.util.List;

@Data
public class KpiDashboardDto {
    private int ordersInProduction;
    private int operationsActive;
    private int delayedOrders;
    private int delayedOperations;
    private int readyForDelivery;
    private int onTimeCompletionRate;
    private double averageProductionDurationMinutes;
    private int todayWorkload;
    private List<ProductionSchedulingService.DepartmentCapacity> departmentCapacities;

    // WIP KPIs
    private int wipOrders;
    private int wipOperations;
    private int totalRemainingQuantity;
    private double averageCompletionPercentage;
    private int operationsCarriedFromPreviousDays;
    private double productionEfficiency;
}
