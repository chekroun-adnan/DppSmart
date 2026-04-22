package com.dppsmart.dppsmart.User.Controllers;

import com.dppsmart.dppsmart.User.DTO.UpdateUserDto;
import com.dppsmart.dppsmart.User.DTO.UserDto;
import com.dppsmart.dppsmart.User.Services.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getByEmail(userDetails.getUsername()));
    }

    @PutMapping("/update")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateUser(
            @RequestBody @Valid UpdateUserDto user,
            @AuthenticationPrincipal UserDetails userDetails) {

        UserDto updatedUser = userService.updateOwnInfo(user, userDetails.getUsername());

        return ResponseEntity.ok(updatedUser);
    }
    @DeleteMapping("/delete/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteMyAccount(Authentication authentication){

        userService.deleteOwnAccount(authentication);

        return ResponseEntity.ok("Your account has been deleted");
    }
}
