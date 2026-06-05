package com.dppsmart.dppsmart.User.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String userId;
    private String email;
    private Roles role;
    private String organizationId;
    private List<String> assignedOrganizationIds;

    // Employee-specific fields (null for non-employee roles)
    private String employeeId;
    private String employeeCode;
    private String departmentId;
    private String departmentName;
    private String fullName;

    public AuthResponse(String token, String id, String email, Roles role) {
        this.accessToken = token;
        this.userId = id;
        this.email = email;
        this.role = role;
    }
}
