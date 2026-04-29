package com.dppsmart.dppsmart.Dashboard.Controllers;

import com.dppsmart.dppsmart.Dashboard.DTO.DashboardResponseDto;
import com.dppsmart.dppsmart.Dashboard.Services.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DashboardResponseDto> me(@RequestParam(required = false) String orgId) {
        return ResponseEntity.ok(dashboardService.getMyDashboard(orgId));
    }
}

