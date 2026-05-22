package com.dppsmart.dppsmart.Production.Entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "productions")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Production {

    @Id
    private String id;
    private String productId;
    private String organizationId;
    private ProductionStatus status;
    private int quantity;
    private List<ProductionStep> steps;

    private String clientOrderId;
    private LocalDate estimatedEndDate;
    private LocalDateTime completedAt;

    private String assignedTo;
    private String allocationSessionId;
    private Integer priority;
    private LocalDateTime startedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean materialsConsumed;
}
