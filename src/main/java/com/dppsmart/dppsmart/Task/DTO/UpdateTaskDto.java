package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskPriority;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UpdateTaskDto {

    @NotBlank(message = "id is required")
    private String id;

    private String title;
    private String description;
    private String organizationId;
    private List<String> assignedEmployeeIds;
    private TaskStatus status;
    private TaskPriority priority;
    private Integer progress;
    private LocalDateTime dueDate;
}
