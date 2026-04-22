package com.dppsmart.dppsmart.Employee.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateEmployeeDto {
    @NotBlank(message = "id is required")
    private String id;

    private String fullName;
    private String role;
    private String department;

    @Min(value = 0, message = "performanceScore must be >= 0")
    @Max(value = 100, message = "performanceScore must be <= 100")
    private Double performanceScore;

    private String organizationId;
}

