package com.dppsmart.dppsmart.User.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminCreateUserDto {

    private String name;

    private String email;

    private String password;
    private Roles role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
