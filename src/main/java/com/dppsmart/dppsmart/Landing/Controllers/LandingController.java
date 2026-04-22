package com.dppsmart.dppsmart.Landing.Controllers;

import com.dppsmart.dppsmart.Landing.DTO.ContactRequestDto;
import com.dppsmart.dppsmart.Landing.DTO.LandingResponseDto;
import com.dppsmart.dppsmart.Landing.Services.LandingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class LandingController {
    private final LandingService landingService;

    @GetMapping("/landing")
    public ResponseEntity<LandingResponseDto> landing() {
        return ResponseEntity.ok(landingService.getLanding());
    }

    @PostMapping("/contact")
    public ResponseEntity<?> contact(@RequestBody @Valid ContactRequestDto dto, HttpServletRequest request) {
        landingService.createContactLead(dto, request);
        return ResponseEntity.ok().build();
    }
}

