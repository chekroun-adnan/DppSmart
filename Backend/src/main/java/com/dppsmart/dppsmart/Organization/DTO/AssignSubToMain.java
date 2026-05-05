package com.dppsmart.dppsmart.Organization.DTO;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class AssignSubToMain {
    @NotBlank(message = "subOrganizationId is required")
    private String subOrganizationId;

    @NotBlank(message = "parentOrganizationId is required")
    private String parentOrganizationId;

}
