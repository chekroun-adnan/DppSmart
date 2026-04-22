package com.dppsmart.dppsmart.Organization.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignUserToOrganizationDto {
    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "organizationId is required")
    private String organizationId;
}

