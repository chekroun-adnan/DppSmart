package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DailyOperationDto {
    private String operationId;
    private String orderId;
    private String orderReference;
    private String productName;
    private String operationName;
    private String department;
    private String assignedEmployee;
    private String assignedEmployeeName;
    private LocalDateTime plannedStartDateTime;
    private LocalDateTime plannedEndDateTime;
    private LocalDateTime forecastStartDateTime;
    private LocalDateTime forecastEndDateTime;
    private Integer quantity;
    private String durationFormatted;
    private ProductionStepStatus status;
    private boolean isOverdue;
    private int priorityScore;
    private String priorityLevel;
    private String deliveryDateLabel;
    private String clientName;
    private Integer sequenceOrder;

    // Health & Delay
    private Integer healthScore;
    private String delayStatus;
    private Double delayMinutes;
    private Double actualDuration;
    private Double plannedDuration;

    // WIP / Quantity
    private Integer requiredQuantity;
    private Integer completedQuantity;
    private Integer remainingQuantity;
    private Double completionPercentage;

    // Carry forward
    private boolean carriedForward;
}
