package com.dppsmart.dppsmart.User.Mapper;


import com.dppsmart.dppsmart.User.DTO.RegisterDto;
import com.dppsmart.dppsmart.User.DTO.UserDto;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;

public class AuthMapper {

    public static UserDto toDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setOrganizationId(user.getOrganizationId());
        dto.setAssignedOrganizationIds(user.getAssignedOrganizationIds());
        return dto;
    }

    public static User toEntity(RegisterDto dto) {
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setRole(Roles.CLIENT);
        return user;
    }
}