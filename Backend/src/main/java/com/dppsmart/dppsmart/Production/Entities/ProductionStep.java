package com.dppsmart.dppsmart.Production.Entities;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProductionStep {

    private String stepName;

    private String description;

    private Boolean completed;

    private Integer orderIndex;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private String machine;

    private String operator;

    private Double durationMinutes;

    private String qualityCheck;

    private String operationId;
    private String operationName;
    private String instructions;
    private Double durationPerUnit;
    private String durationUnit;
    private Integer orderQuantity;
    private Double totalDuration;
    private Double executionCostPerUnit;
    private Double totalExecutionCost;

    // Workforce assignment fields
    private String assignedEmployeeId;
    private String assignedDepartmentId;
    private String assignedDepartmentName;
    private LocalDateTime assignedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
