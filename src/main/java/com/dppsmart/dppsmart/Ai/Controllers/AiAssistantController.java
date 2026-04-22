package com.dppsmart.dppsmart.Ai.Controllers;

import com.dppsmart.dppsmart.Ai.DTO.AiAskRequestDto;
import com.dppsmart.dppsmart.Ai.Services.AiAssistantService;
import com.dppsmart.dppsmart.Common.ApiResponse;
import com.dppsmart.dppsmart.Security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAssistantController {
    private final AiAssistantService aiAssistantService;

    @PostMapping("/ask")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE','CLIENT')")
    public ResponseEntity<ApiResponse<String>> ask(@RequestBody @Valid AiAskRequestDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth != null ? auth.getPrincipal() : null;
        String userId = (principal instanceof UserPrincipal up) ? up.getId() : null;
        String response = aiAssistantService.processRequest(userId, dto.getMessage());
        return ResponseEntity.ok(ApiResponse.ok("ok", response));
    }
}

