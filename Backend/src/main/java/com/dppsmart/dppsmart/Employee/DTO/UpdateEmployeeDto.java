package com.dppsmart.dppsmart.Employee.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateEmployeeDto {
    @NotBlank(message = "id is required")
    private String id;

    private String fullName;
    private String email;
    private String role;
    private String organizationId;
}

