package com.dppsmart.dppsmart.Task.Mapper;

import com.dppsmart.dppsmart.Task.DTO.TaskResponseDto;
import com.dppsmart.dppsmart.Task.DTO.TimelineEventDto;
import com.dppsmart.dppsmart.Task.Entities.Task;
import com.dppsmart.dppsmart.Task.Entities.TaskTimelineEvent;

public class TaskMapper {

    public static TaskResponseDto toDto(Task task) {
        TaskResponseDto dto = new TaskResponseDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());

        dto.setTaskType(task.getTaskType());
        dto.setPriority(task.getPriority());
        dto.setStatus(task.getStatus());

        dto.setOrganizationId(task.getOrganizationId());

        dto.setAssignedEmployeeId(task.getAssignedEmployeeId());
        dto.setAssignedEmployeeName(task.getAssignedEmployeeName());
        dto.setAssignedDepartmentId(task.getAssignedDepartmentId());
        dto.setAssignedDepartmentName(task.getAssignedDepartmentName());

        dto.setOrderId(task.getOrderId());
        dto.setOrderReference(task.getOrderReference());
        dto.setProductionOrderId(task.getProductionOrderId());
        dto.setOperationId(task.getOperationId());
        dto.setOperationName(task.getOperationName());

        dto.setPlannedStart(task.getPlannedStart());
        dto.setPlannedEnd(task.getPlannedEnd());

        dto.setActualStart(task.getActualStart());
        dto.setActualEnd(task.getActualEnd());

        dto.setCompletionPercentage(task.getCompletionPercentage());

        dto.setRequiredQuantity(task.getRequiredQuantity());
        dto.setCompletedQuantity(task.getCompletedQuantity());
        dto.setRemainingQuantity(task.getRemainingQuantity());

        dto.setEstimatedDurationMinutes(task.getEstimatedDurationMinutes());
        dto.setActualDurationMinutes(task.getActualDurationMinutes());

        dto.setDelayMinutes(task.getDelayMinutes());

        dto.setNotes(task.getNotes());

        dto.setCreatedBy(task.getCreatedBy());
        dto.setUpdatedBy(task.getUpdatedBy());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setUpdatedAt(task.getUpdatedAt());

        if (task.getTimeline() != null) {
            dto.setTimeline(task.getTimeline().stream()
                    .map(TaskMapper::toTimelineDto)
                    .toList());
        }

        return dto;
    }

    public static TimelineEventDto toTimelineDto(TaskTimelineEvent event) {
        TimelineEventDto dto = new TimelineEventDto();
        dto.setEventType(event.getEventType());
        dto.setLabel(event.getLabel());
        dto.setEmployeeId(event.getEmployeeId());
        dto.setEmployeeName(event.getEmployeeName());
        dto.setPreviousValue(event.getPreviousValue());
        dto.setNewValue(event.getNewValue());
        dto.setNotes(event.getNotes());
        dto.setTimestamp(event.getTimestamp());
        return dto;
    }
}
