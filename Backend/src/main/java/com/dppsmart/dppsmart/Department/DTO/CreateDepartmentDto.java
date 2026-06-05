package com.dppsmart.dppsmart.Department.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDepartmentDto {
    @NotBlank(message = "name is required")
    private String name;
    private String description;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
}
