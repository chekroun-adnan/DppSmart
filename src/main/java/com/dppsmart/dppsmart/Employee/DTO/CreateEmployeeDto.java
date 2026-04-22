package com.dppsmart.dppsmart.Employee.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateEmployeeDto {
    @NotBlank(message = "fullName is required")
    private String fullName;

    @NotBlank(message = "role is required")
    private String role;

    @NotBlank(message = "department is required")
    private String department;

    @NotNull(message = "performanceScore is required")
    @Min(value = 0, message = "performanceScore must be >= 0")
    @Max(value = 100, message = "performanceScore must be <= 100")
    private Double performanceScore;

    @NotBlank(message = "organizationId is required")
    private String organizationId;
}

