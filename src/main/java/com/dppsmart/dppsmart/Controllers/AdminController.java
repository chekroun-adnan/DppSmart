package com.dppsmart.dppsmart.Controllers;


import com.dppsmart.dppsmart.DTO.AdminCreateUserDto;
import com.dppsmart.dppsmart.DTO.PasswordUpdateRequest;
import com.dppsmart.dppsmart.DTO.UserDto;
import com.dppsmart.dppsmart.Entities.User;
import com.dppsmart.dppsmart.Services.AdminService;
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
            List<User> users = adminService.getAllUsers();
            return ResponseEntity.status(HttpStatus.CREATED).body(users);

    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/delete/account")
    public ResponseEntity<?>deleteAnyAccount(@RequestParam String id){
        adminService.deleteAnyAccount(id);
        return ResponseEntity.ok("This account has been deleted");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/update/password")
    public ResponseEntity<?> updateUserPassword(
            @RequestParam String id,
            @RequestBody @Valid PasswordUpdateRequest request
    ) {
        UserDto updatedUser = adminService.updateUserPassword(id, request.getPassword());
        return ResponseEntity.ok(updatedUser);
    }
}
