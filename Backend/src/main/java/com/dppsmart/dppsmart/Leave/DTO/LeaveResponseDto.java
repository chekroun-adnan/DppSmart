package com.dppsmart.dppsmart.Leave.DTO;

import com.dppsmart.dppsmart.Leave.Entities.LeaveStatus;
import com.dppsmart.dppsmart.Leave.Entities.LeaveType;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LeaveResponseDto {
    private String id;
    private String employeeId;
    private String employeeName;
    private String organizationId;
    private LeaveType type;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private LeaveStatus status;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
}
