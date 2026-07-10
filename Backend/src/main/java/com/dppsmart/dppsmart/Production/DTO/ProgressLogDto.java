package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProgressLogDto {
    private String id;
    private String stepId;
    private String orderId;
    private String department;
    private String action;
    private Integer reportedQuantity;
    private Integer completedQuantity;
    private Integer remainingQuantity;
    private Double completionPercentage;
    private String reportedBy;
    private String reportedByName;
    private LocalDateTime timestamp;
    private String notes;
}
