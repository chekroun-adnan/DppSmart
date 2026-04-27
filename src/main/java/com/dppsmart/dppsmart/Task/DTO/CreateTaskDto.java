package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskPriority;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateTaskDto {

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotBlank(message = "organizationId is required")
    private String organizationId;

    private List<String> assignedEmployeeIds;

    @NotNull(message = "status is required")
    private TaskStatus status;

    @NotNull(message = "priority is required")
    private TaskPriority priority;

    private Integer progress;

    private LocalDateTime dueDate;
}
