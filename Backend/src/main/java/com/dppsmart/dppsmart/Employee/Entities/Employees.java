package com.dppsmart.dppsmart.Employee.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "employees")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Employees {

    @Id
    private String id;

    @Indexed(unique = true, sparse = true)
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
    private EmployeeStatus status = EmployeeStatus.ACTIVE;
    private Double salary;
    private String notes;
    private String qrCode;
    private boolean active = true;

    private String role;

    private List<EmployeeSkill> skills = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
