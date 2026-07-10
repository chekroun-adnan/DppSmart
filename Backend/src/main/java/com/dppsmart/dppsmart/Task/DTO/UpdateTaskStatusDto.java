package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import lombok.Data;

@Data
public class UpdateTaskStatusDto {
    private TaskStatus status;
    private Integer completionPercentage;
    private Integer completedQuantity;
    private String notes;
}
