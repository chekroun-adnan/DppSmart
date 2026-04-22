package com.dppsmart.dppsmart.User.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "users")
@Data
public class User {
    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private Roles role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /**
     * Primary organization for legacy/compatibility.
     * Prefer using assignedOrganizationIds for access checks.
     */
    private String organizationId;
    /**
     * Organizations this user is allowed to access (especially for SUBADMIN).
     * Kept as IDs to avoid circular references and heavy MongoDB DBRef usage.
     */
    private List<String> assignedOrganizationIds;
}
