package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderProductionDto {
    private String orderId;
    private String orderReference;
    private String clientName;
    private String organizationId;
    private String organizationName;
    private List<OrderProductionItemDto> items;
    private int totalQuantity;
    private int completedSteps;
    private int totalSteps;
    private int progressPercent;
    private String status;
    private boolean stepsGenerated;
    private String currentOperation;
    private String nextOperation;
    private LocalDateTime estimatedStartTime;
    private LocalDateTime estimatedCompletionDateTime;
    private String estimatedCompletionTime;
    private String warning;
    private LocalDateTime plannedStartDateTime;
    private LocalDateTime plannedEndDateTime;

    // NEW: Forecast & Health
    private LocalDateTime forecastEndDateTime;
    private String delayStatus;
    private Double delayMinutes;
    private Integer healthScore;
    private Integer priorityScore;
    private String priorityLevel;
    private Integer totalIssues;
    private Integer unresolvedIssues;

    // WIP / Quantity tracking
    private Integer totalRequiredQuantity;
    private Integer totalCompletedQuantity;
    private Integer totalRemainingQuantity;
    private Double averageCompletionPercentage;
}
