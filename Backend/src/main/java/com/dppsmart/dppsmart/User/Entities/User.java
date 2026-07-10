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
    private String organizationId;
    private List<String> assignedOrganizationIds;
    private String googleId;
    private String avatarUrl;

    // Billing
    private String billingAddress;
    private String city;
    private String country;
    private String vatNumber;
    private String companyName;
    private String phone;
}
