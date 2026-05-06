package com.dppsmart.dppsmart.User.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AdminCreateUserDto {

    private String name;

    private String email;

    private String password;
    private Roles role;
    private String organizationId;
    private List<String> assignedOrganizationIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
