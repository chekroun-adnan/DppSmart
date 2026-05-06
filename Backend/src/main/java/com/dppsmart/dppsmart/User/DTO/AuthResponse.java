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

    public AuthResponse(String token, String id, String email, Roles role) {
    }
}
