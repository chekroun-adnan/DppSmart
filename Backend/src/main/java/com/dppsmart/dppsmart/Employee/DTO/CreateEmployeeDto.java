package com.dppsmart.dppsmart.Employee.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateEmployeeDto {
    @NotBlank(message = "fullName is required")
    private String fullName;

    @NotBlank(message = "email is required")
    private String email;

    @NotBlank(message = "password is required")
    private String password;

    private String role;

    @NotBlank(message = "organizationId is required")
    private String organizationId;
}

