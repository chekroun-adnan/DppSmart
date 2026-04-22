package com.dppsmart.dppsmart.Employee.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EmployeeResponseDto {
    private String id;
    private String fullName;
    private String role;
    private String department;
    private Double performanceScore;
    private String organizationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}

