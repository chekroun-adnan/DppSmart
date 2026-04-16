package com.dppsmart.dppsmart.Organization.Entities;


import lombok.Data;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collation = "Organizations")
@Data
public class Organization {

    private String id;
    private String name;
    private OrganizationType organizationType;
    private String parentOrganizationId;
    private String createdByUserId;
}
