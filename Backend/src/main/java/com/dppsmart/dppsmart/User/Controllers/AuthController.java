package com.dppsmart.dppsmart.User.Controllers;

import com.dppsmart.dppsmart.Security.Session.BruteForceProtectionService;
import com.dppsmart.dppsmart.Security.Session.SessionService;
import com.dppsmart.dppsmart.User.DTO.AuthResponse;
import com.dppsmart.dppsmart.User.DTO.LoginDto;
import com.dppsmart.dppsmart.User.DTO.RefreshRequest;
import com.dppsmart.dppsmart.User.DTO.RegisterDto;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.User.Services.AuthService;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, register, refresh, logout")
public class AuthController {

    private final AuthService authService;
    private final SessionService sessionService;
    private final BruteForceProtectionService bruteForceService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    @Operation(summary = "Register a new account")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterDto dto) {
        return ResponseEntity.ok(authService.register(dto));
    }

    @PostMapping("/login")
    @Operation(summary = "Login — creates a tracked session, brute-force protected")
    public ResponseEntity<AuthResponse> login(
            @RequestBody @Valid LoginDto dto,
            HttpServletRequest request) {
        return ResponseEntity.ok(authService.login(dto, request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using a valid refresh token")
    public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Logout current session (revokes current JWT)")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(authorization);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke all active sessions on all devices")
    public ResponseEntity<Void> logoutAll(
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        User user = currentUser();
        authService.revokeAllUserTokens(user.getId());
        sessionService.revokeAllSessions(user.getId(), null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/security/failed-attempts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get recent failed login attempt count for current user")
    public ResponseEntity<Map<String, Object>> getFailedAttempts() {
        User user = currentUser();
        long count = bruteForceService.getRecentFailures(user.getEmail());
        return ResponseEntity.ok(Map.of(
                "email", user.getEmail(),
                "recentFailedAttempts", count
        ));
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
