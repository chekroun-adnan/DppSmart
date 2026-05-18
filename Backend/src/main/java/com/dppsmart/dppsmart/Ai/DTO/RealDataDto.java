package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RealDataDto {
    private long totalScans;
    private long scansLast7Days;
    private long scansLast30Days;
    private long uniqueProductsScanned;
    private long totalOrders;
    private long ordersLast7Days;
    private long ordersLast30Days;
    private long totalProductions;
    private long productionsLast7Days;
    private long lowStockCount;
    private long criticalStockCount;
    private long totalProducts;
    private Map<String, Long> ordersByStatus;
    private Map<String, Long> productionsByStatus;
    private List<TrendPoint> scansByDay;
    private List<TrendPoint> ordersByDay;
    private List<LowStockItem> lowStockItems;
    private Map<String, Long> topScannedProducts;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LowStockItem {
        private String id;
        private String name;
        private int quantity;
        private int threshold;
    }
}