package com.dppsmart.dppsmart.Services;


import com.dppsmart.dppsmart.DTO.UpdateUserDto;
import com.dppsmart.dppsmart.DTO.UserDto;
import com.dppsmart.dppsmart.Entities.User;
import com.dppsmart.dppsmart.Mapper.AuthMapper;
import com.dppsmart.dppsmart.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private AuthService authService;

    @PreAuthorize("isAuthenticated()")
    public UserDto updateOwnInfo(UpdateUserDto dto, String email) {

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (dto.getName() != null && !dto.getName().isEmpty()) {
            currentUser.setName(dto.getName());
        }

        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            currentUser.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        currentUser.setUpdatedAt(LocalDateTime.now());

        return AuthMapper.toDto(userRepository.save(currentUser));
    }

    @PreAuthorize("isAuthenticated()")
    public void deleteOwnAccount(Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userRepository.delete(user);
    }

}
