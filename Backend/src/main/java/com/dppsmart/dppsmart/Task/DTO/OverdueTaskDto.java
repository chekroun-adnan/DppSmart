package com.dppsmart.dppsmart.Task.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OverdueTaskDto {
    private String taskId;
    private String title;
    private String employeeName;
    private String departmentName;
    private String orderReference;
    private long delayMinutes;
    private LocalDateTime plannedEnd;
    private String priority;
}
