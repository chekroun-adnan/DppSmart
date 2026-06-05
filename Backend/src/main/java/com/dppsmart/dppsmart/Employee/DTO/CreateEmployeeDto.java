package com.dppsmart.dppsmart.Employee.DTO;

import com.dppsmart.dppsmart.Employee.Entities.EmployeeSkill;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateEmployeeDto {
    @NotBlank(message = "fullName is required")
    private String fullName;
    private String firstName;
    private String lastName;
    @NotBlank(message = "email is required")
    private String email;
    @NotBlank(message = "password is required")
    private String password;
    private String role;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
    private String phone;
    private String address;
    private String position;
    private String departmentId;
    private LocalDate hireDate;
    private Double salary;
    private String notes;
    private List<EmployeeSkill> skills;
}
