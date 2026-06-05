package com.dppsmart.dppsmart.Employee.DTO;

import com.dppsmart.dppsmart.Employee.Entities.EmployeeSkill;
import com.dppsmart.dppsmart.Employee.Entities.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateEmployeeDto {
    @NotBlank(message = "id is required")
    private String id;
    private String fullName;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String organizationId;
    private String phone;
    private String address;
    private String position;
    private String departmentId;
    private LocalDate hireDate;
    private EmployeeStatus status;
    private Double salary;
    private String notes;
    private Boolean active;
    private List<EmployeeSkill> skills;
}
