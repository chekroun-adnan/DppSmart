package com.dppsmart.dppsmart.User.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import jakarta.validation.constraints.Email;
import lombok.Data;

import java.util.List;

@Data
public class AdminUpdateUserDto {
    private String name;

    @Email(message = "email must be valid")
    private String email;

    private Roles role;

    private String organizationId;

    private List<String> assignedOrganizationIds;
}

