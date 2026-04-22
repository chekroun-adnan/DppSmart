package com.dppsmart.dppsmart.Dashboard.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import lombok.Data;

import java.util.Map;

@Data
public class DashboardKpisDto {
    private Long organizationsMain;
    private Long organizationsSub;

    private UserCountsDto userCounts;

    private Long products;
    private Long productions;
    private Long orders;
    private Long employees;
    private Long scans;

    private Long lowStockItems;

    private Map<ProductionStatus, Long> productionsByStatus;
    private Map<String, Long> ordersByStatus;
}

