package com.dppsmart.dppsmart.Organization.Entities;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "organizations")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Organization {

    @Id
    private String id;
    private String name;
    private OrganizationType organizationType;
    private String parentOrganizationId;
    private String createdByUserId;
}
