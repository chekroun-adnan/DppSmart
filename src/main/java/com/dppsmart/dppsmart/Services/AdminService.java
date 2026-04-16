package com.dppsmart.dppsmart.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.DTO.AdminCreateUserDto;
import com.dppsmart.dppsmart.DTO.UserDto;
import com.dppsmart.dppsmart.Entities.Roles;
import com.dppsmart.dppsmart.Entities.User;
import com.dppsmart.dppsmart.Mapper.AuthMapper;
import com.dppsmart.dppsmart.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserDto adminCreateUser(AdminCreateUserDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (admin.getRole() != Roles.ADMIN) {
            throw new RuntimeException("Only ADMIN can create users");
        }

        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("User already exists");
        }

        User user = new User();
        user.setId(NanoIdUtils.randomNanoId());
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setCreatedAt(LocalDateTime.now()); // FIXED
        user.setRole(dto.getRole());

        User savedUser = userRepository.save(user);

        return AuthMapper.toDto(savedUser);
    }

    public List<User> getAllUsers(){
        return userRepository.findAll();
    }

    public void deleteAnyAccount(String userId){
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }

    public UserDto updateUserPassword(String id, String newPassword) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (!admin.getRole().equals(Roles.ADMIN)) {
            throw new RuntimeException("Only ADMIN can update passwords");
        }

        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        targetUser.setPassword(passwordEncoder.encode(newPassword));

        User saved = userRepository.save(targetUser);

        return AuthMapper.toDto(saved);
    }
}
