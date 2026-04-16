package com.dppsmart.dppsmart.User.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDto {
    private String id;
    private String name;
    private String email;
    private Roles role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
