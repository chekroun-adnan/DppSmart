package com.dppsmart.dppsmart.Task.Mapper;

import com.dppsmart.dppsmart.Task.DTO.TaskResponseDto;
import com.dppsmart.dppsmart.Task.Entities.Task;

public class TaskMapper {

    public static TaskResponseDto toDto(Task task) {
        TaskResponseDto dto = new TaskResponseDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setOrganizationId(task.getOrganizationId());
        dto.setAssignedEmployeeIds(task.getAssignedEmployeeIds());
        dto.setStatus(task.getStatus());
        dto.setPriority(task.getPriority());
        dto.setProgress(task.getProgress());
        dto.setDueDate(task.getDueDate());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setUpdatedAt(task.getUpdatedAt());
        dto.setCreatedBy(task.getCreatedBy());
        dto.setUpdatedBy(task.getUpdatedBy());
        return dto;
    }
}
