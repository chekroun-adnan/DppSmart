package com.dppsmart.dppsmart.User.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.User.DTO.AdminCreateUserDto;
import com.dppsmart.dppsmart.User.DTO.AdminUpdateUserDto;
import com.dppsmart.dppsmart.User.DTO.UserDto;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Mapper.AuthMapper;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
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
                .orElseThrow(() -> new NotFoundException("Admin not found"));

        if (admin.getRole() != Roles.ADMIN) {
            throw new BadRequestException("Only ADMIN can create users");
        }

        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new BadRequestException("User already exists");
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

    public List<UserDto> getAllUsers(){
        return userRepository.findAll().stream().map(AuthMapper::toDto).toList();
    }

    public void deleteAnyAccount(String userId){
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        userRepository.delete(user);
    }

    public UserDto updateUserPassword(String id, String newPassword) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("Admin not found"));

        if (!admin.getRole().equals(Roles.ADMIN)) {
            throw new BadRequestException("Only ADMIN can update passwords");
        }

        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        targetUser.setPassword(passwordEncoder.encode(newPassword));

        User saved = userRepository.save(targetUser);

        return AuthMapper.toDto(saved);
    }

    public UserDto getUserById(String id) {
        return AuthMapper.toDto(
                userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"))
        );
    }

    public UserDto updateUser(String id, AdminUpdateUserDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (dto.getName() != null && !dto.getName().isBlank()) user.setName(dto.getName());
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            if (!dto.getEmail().equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(dto.getEmail());
        }
        if (dto.getRole() != null) user.setRole(dto.getRole());
        if (dto.getOrganizationId() != null) user.setOrganizationId(dto.getOrganizationId());
        if (dto.getAssignedOrganizationIds() != null) user.setAssignedOrganizationIds(dto.getAssignedOrganizationIds());

        user.setUpdatedAt(LocalDateTime.now());
        return AuthMapper.toDto(userRepository.save(user));
    }
}
