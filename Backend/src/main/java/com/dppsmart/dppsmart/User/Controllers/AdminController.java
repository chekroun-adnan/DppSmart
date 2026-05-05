package com.dppsmart.dppsmart.User.Controllers;


import com.dppsmart.dppsmart.User.DTO.AdminCreateUserDto;
import com.dppsmart.dppsmart.User.DTO.AdminUpdateUserDto;
import com.dppsmart.dppsmart.User.DTO.PasswordUpdateRequest;
import com.dppsmart.dppsmart.User.DTO.UserDto;
import com.dppsmart.dppsmart.User.Services.AdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @PostMapping("/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUse(@RequestBody @Valid AdminCreateUserDto adminCreateUserDto){
        adminService.adminCreateUser(adminCreateUserDto);
        return ResponseEntity.status(HttpStatus.CREATED).body("User Created Successfully");
    }


    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/get/all")
    public ResponseEntity<?> getAllUsers(){
            List<UserDto> users = adminService.getAllUsers();
            return ResponseEntity.ok(users);

    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/users/{id}")
    public ResponseEntity<UserDto> updateUser(@PathVariable String id, @RequestBody @Valid AdminUpdateUserDto dto) {
        return ResponseEntity.ok(adminService.updateUser(id, dto));
    }

    @DeleteMapping("/delete/account")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?>deleteAnyAccount(@RequestParam String id){
        adminService.deleteAnyAccount(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/update/password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserPassword(
            @RequestParam String id,
            @RequestBody @Valid PasswordUpdateRequest request
    ) {
        UserDto updatedUser = adminService.updateUserPassword(id, request.getPassword());
        return ResponseEntity.ok(updatedUser);
    }
}
