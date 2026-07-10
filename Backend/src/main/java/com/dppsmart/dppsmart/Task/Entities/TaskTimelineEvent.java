package com.dppsmart.dppsmart.Task.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskTimelineEvent {
    private String eventType;
    private String label;
    private String employeeId;
    private String employeeName;
    private Integer previousValue;
    private Integer newValue;
    private String notes;
    private LocalDateTime timestamp;
}
