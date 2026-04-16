package com.dppsmart.dppsmart.Mapper;


import com.dppsmart.dppsmart.DTO.RegisterDto;
import com.dppsmart.dppsmart.DTO.UserDto;
import com.dppsmart.dppsmart.Entities.Roles;
import com.dppsmart.dppsmart.Entities.User;

public class AuthMapper {

    public static UserDto toDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
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