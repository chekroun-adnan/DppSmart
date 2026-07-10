package com.dppsmart.dppsmart.Production.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "production_progress_logs")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProductionProgressLog {

    @Id
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
