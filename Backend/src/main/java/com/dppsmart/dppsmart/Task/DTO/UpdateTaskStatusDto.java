package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTaskStatusDto {

    @NotNull(message = "status is required")
    private TaskStatus status;

    private Integer progress;
}
