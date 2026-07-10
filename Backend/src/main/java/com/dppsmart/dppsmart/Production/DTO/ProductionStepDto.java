package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductionStepDto {
    private String id;
    private String productionOrderId;
    private String orderId;
    private String orderItemId;
    private String productId;
    private String productName;
    private String operationId;
    private String operationName;
    private Integer sequenceOrder;
    private Double durationPerUnit;
    private String durationUnit;
    private Integer orderQuantity;
    private Double totalDuration;
    private String totalDurationFormatted;
    private String responsibleDepartment;
    private String requiredResources;
    private Boolean qualityCheckRequired;
    private Boolean canRunInParallel;
    private String instructions;
    private ProductionStepStatus status;
    private Boolean overdue;
    private LocalDateTime plannedStartTime;
    private LocalDateTime plannedEndTime;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String blockedReason;
    private String completedBy;

    private LocalDateTime forecastStartTime;
    private LocalDateTime forecastEndTime;
    private Double actualDuration;
    private String delayStatus;
    private Double delayMinutes;
    private Integer healthScore;
    private String assignedEmployee;
    private String assignedEmployeeName;
    private List<OperationIssueDto> issues;

    private Integer requiredQuantity;
    private Integer completedQuantity;
    private Integer remainingQuantity;
    private Double completionPercentage;
    private Integer plannedDurationMinutes;
    private Integer actualDurationMinutes;
    private Integer remainingDurationMinutes;

    private Integer producedQuantity;
    private Integer rejectedQuantity;
    private Integer reworkedQuantity;
}
