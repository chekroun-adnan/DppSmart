package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskPriority;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import com.dppsmart.dppsmart.Task.Entities.TaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateTaskDto {

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    private TaskType taskType;

    @NotBlank(message = "organizationId is required")
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

    @NotNull(message = "status is required")
    private TaskStatus status;

    @NotNull(message = "priority is required")
    private TaskPriority priority;

    private Integer completionPercentage;

    private LocalDateTime plannedStart;
    private LocalDateTime plannedEnd;

    private Integer requiredQuantity;
    private Integer completedQuantity;

    private Integer estimatedDurationMinutes;

    private String notes;
}
