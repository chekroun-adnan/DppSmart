package com.dppsmart.dppsmart.Task.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tasks")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Task {

    @Id
    private String id;
    private String title;
    private String description;

    private TaskType taskType;
    private TaskPriority priority;
    private TaskStatus status;

    private String organizationId;

    private String assignedEmployeeId;
    private String assignedEmployeeName;
    private String assignedDepartmentId;
    private String assignedDepartmentName;

    private String orderId;
    private String orderReference;
    private String productionOrderId;
    private String operationId;
    private String operationName;

    private LocalDateTime plannedStart;
    private LocalDateTime plannedEnd;

    private LocalDateTime actualStart;
    private LocalDateTime actualEnd;

    private Integer completionPercentage;

    private Integer requiredQuantity;
    private Integer completedQuantity;
    private Integer remainingQuantity;

    private Integer estimatedDurationMinutes;
    private Integer actualDurationMinutes;

    private Integer delayMinutes;

    private String notes;

    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<TaskTimelineEvent> timeline = new ArrayList<>();
}
