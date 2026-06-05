package com.dppsmart.dppsmart.Employee.DTO;

import com.dppsmart.dppsmart.Employee.Entities.EmployeeSkill;
import com.dppsmart.dppsmart.Employee.Entities.EmployeeStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class EmployeeResponseDto {
    private String id;
    private String employeeCode;
    private String fullName;
    private String firstName;
    private String lastName;
    private String photo;
    private String email;
    private String phone;
    private String address;
    private String position;
    private String departmentId;
    private String departmentName;
    private String organizationId;
    private LocalDate hireDate;
    private EmployeeStatus status;
    private Double salary;
    private String notes;
    private String qrCode;
    private boolean active;
    private String role;
    private List<EmployeeSkill> skills;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
