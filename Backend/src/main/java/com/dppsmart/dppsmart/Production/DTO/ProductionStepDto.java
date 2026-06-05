package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import lombok.Data;

import java.time.LocalDateTime;

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
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String blockedReason;
    private String completedBy;
}
