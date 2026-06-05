package com.dppsmart.dppsmart.Production.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "production_step_entities")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProductionStepEntity {

    @Id
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

    @Builder.Default
    private ProductionStepStatus status = ProductionStepStatus.PENDING;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String blockedReason;
    private String completedBy;
    private LocalDateTime createdAt;
}
