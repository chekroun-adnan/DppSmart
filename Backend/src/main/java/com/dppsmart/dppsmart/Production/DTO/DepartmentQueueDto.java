package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentQueueDto {
    private String department;
    private List<DepartmentOperation> todayOperations;
    private List<DepartmentOperation> upcomingOperations;
    private List<DepartmentOperation> delayedOperations;
    private double availableHours;
    private double assignedHours;
    private double utilizationPercent;
    private String capacityStatus;

    @Data
    public static class DepartmentOperation {
        private String operationId;
        private String orderId;
        private String orderReference;
        private String productName;
        private String operationName;
        private Integer quantity;
        private LocalDateTime plannedStartDateTime;
        private LocalDateTime plannedEndDateTime;
        private LocalDateTime forecastEndDateTime;
        private ProductionStepStatus status;
        private String assignedEmployee;
        private String assignedEmployeeName;
        private Integer sequenceOrder;
        private boolean isOverdue;
        private String delayStatus;
        private Double delayMinutes;
        private Integer healthScore;
        private int priorityScore;

        // WIP / Quantity fields
        private Integer requiredQuantity;
        private Integer completedQuantity;
        private Integer remainingQuantity;
        private Double completionPercentage;
    }
}
