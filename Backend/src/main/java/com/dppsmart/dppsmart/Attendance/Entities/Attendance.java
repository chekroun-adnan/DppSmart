package com.dppsmart.dppsmart.Attendance.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "attendances")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Attendance {
    @Id
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
    private LocalDateTime updatedAt;
}
