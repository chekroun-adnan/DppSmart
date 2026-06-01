package com.dppsmart.dppsmart.Security.Session;

import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Tag(name = "Session Management", description = "Active session listing and revocation")
public class SessionController {

    private final SessionService sessionService;
    private final UserRepository userRepository;

    // ─── GET /api/sessions — list all sessions for current user ──────────────
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all active and recent sessions for the current user")
    public ResponseEntity<List<UserSessionDto>> getMySessions(
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        User user = currentUser();
        String currentTokenId = resolveTokenId(authorization);
        return ResponseEntity.ok(sessionService.getSessionsForUser(user.getId(), currentTokenId));
    }

    // ─── DELETE /api/sessions/{id} — revoke one session ──────────────────────
    @DeleteMapping("/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke a specific session by its ID")
    public ResponseEntity<Void> revokeSession(@PathVariable String sessionId) {
        sessionService.revokeSession(sessionId, currentUser().getId());
        return ResponseEntity.noContent().build();
    }

    // ─── DELETE /api/sessions — revoke ALL other sessions ────────────────────
    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke all sessions except the current one")
    public ResponseEntity<Void> revokeAllOtherSessions(
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        User user = currentUser();
        String currentTokenId = resolveTokenId(authorization);
        sessionService.revokeAllSessions(user.getId(), currentTokenId);
        return ResponseEntity.noContent().build();
    }

    // ─── GET /api/sessions/suspicious — sessions flagged as suspicious ────────
    @GetMapping("/suspicious")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get suspicious sessions for the current user")
    public ResponseEntity<List<UserSessionDto>> getSuspiciousSessions() {
        User user = currentUser();
        return ResponseEntity.ok(sessionService.getSuspiciousSessions(user.getId()));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String resolveTokenId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        String tokenValue = authorization.substring(7);
        return sessionService.getTokenIdFromJwt(tokenValue);
    }
}
