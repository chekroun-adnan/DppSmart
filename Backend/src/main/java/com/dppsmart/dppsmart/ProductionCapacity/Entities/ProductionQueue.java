package com.dppsmart.dppsmart.ProductionCapacity.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "production_queue")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductionQueue {
    @Id
    private String id;
    private String organizationId;
    private String productionId;
    private String orderId;
    private String productId;
    private String workstationId;
    private int quantity;
    private int priority;
    private QueueStatus status;
    private LocalDate scheduledDate;
    private LocalDate estimatedEndDate;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public enum QueueStatus {
        QUEUED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        DELAYED
    }
}
