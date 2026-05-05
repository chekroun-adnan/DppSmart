package com.dppsmart.dppsmart.Organization.DTO;

import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOrganizationDto {
    @NotBlank(message = "name is required")
    private String name;
    private String parentOrganizationId;
    private OrganizationType type;
}
