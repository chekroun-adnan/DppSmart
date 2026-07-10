package com.dppsmart.dppsmart.Task.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TimelineEventDto {
    private String eventType;
    private String label;
    private String employeeId;
    private String employeeName;
    private Integer previousValue;
    private Integer newValue;
    private String notes;
    private LocalDateTime timestamp;
}
