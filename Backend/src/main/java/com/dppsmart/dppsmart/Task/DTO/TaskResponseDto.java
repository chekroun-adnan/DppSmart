package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskPriority;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import com.dppsmart.dppsmart.Task.Entities.TaskType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskResponseDto {

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

    private List<TimelineEventDto> timeline;
}
