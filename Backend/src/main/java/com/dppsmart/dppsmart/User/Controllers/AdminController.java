package com.dppsmart.dppsmart.User.Controllers;


import com.dppsmart.dppsmart.MaterialStock.Services.MaterialStockService;
import com.dppsmart.dppsmart.User.DTO.AdminCreateUserDto;
import com.dppsmart.dppsmart.User.DTO.AdminUpdateUserDto;
import com.dppsmart.dppsmart.User.DTO.PasswordUpdateRequest;
import com.dppsmart.dppsmart.User.DTO.UserDto;
import com.dppsmart.dppsmart.User.Services.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final MaterialStockService materialStockService;

    @PostMapping("/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> createUser(@RequestBody @Valid AdminCreateUserDto adminCreateUserDto){
        UserDto created = adminService.adminCreateUser(adminCreateUserDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
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

    @PostMapping("/stock/repair-material-links")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> repairMaterialLinks() {
        MaterialStockService.RepairMaterialLinksResult result = materialStockService.repairMaterialLinks();
        return ResponseEntity.ok(Map.of(
                "relinked", result.relinked(),
                "stillBroken", result.stillBroken()
        ));
    }

}
