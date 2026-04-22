package com.dppsmart.dppsmart.Organization.DTO;

import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateOrganizationDto {
    @NotBlank(message = "id is required")
    private String id;
    private String name;
    private OrganizationType type;
    private String parentOrganizationId;

}
