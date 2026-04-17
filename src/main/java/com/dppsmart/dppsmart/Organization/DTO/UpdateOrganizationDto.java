package com.dppsmart.dppsmart.Organization.DTO;

import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import lombok.Data;

@Data
public class UpdateOrganizationDto {
    private String id;
    private String name;
    private OrganizationType type;
    private String parentOrganizationId;

}
