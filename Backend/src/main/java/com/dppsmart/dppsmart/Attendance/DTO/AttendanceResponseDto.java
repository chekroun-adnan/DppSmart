package com.dppsmart.dppsmart.Attendance.DTO;

import com.dppsmart.dppsmart.Attendance.Entities.AttendanceStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AttendanceResponseDto {
    private String id;
    private String employeeId;
    private String employeeName;
    private String organizationId;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private Double breakDurationMinutes;
    private Double overtimeDurationMinutes;
    private Double workDurationMinutes;
    private AttendanceStatus status;
    private String notes;
    private LocalDateTime createdAt;
}
