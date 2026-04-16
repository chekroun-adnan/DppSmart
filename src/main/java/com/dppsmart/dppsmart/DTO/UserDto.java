package com.dppsmart.dppsmart.DTO;

import com.dppsmart.dppsmart.Entities.Roles;
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
