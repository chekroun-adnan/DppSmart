package com.dppsmart.dppsmart.Task.DTO;

import com.dppsmart.dppsmart.Task.Entities.TaskPriority;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskResponseDto {

    private String id;
    private String title;
    private String description;
    private String organizationId;
    private List<String> assignedEmployeeIds;
    private TaskStatus status;
    private TaskPriority priority;
    private Integer progress;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
