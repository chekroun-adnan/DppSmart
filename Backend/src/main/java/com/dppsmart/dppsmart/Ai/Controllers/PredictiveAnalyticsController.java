package com.dppsmart.dppsmart.Ai.Controllers;

import com.dppsmart.dppsmart.Ai.DTO.PredictiveAnalysisDto;
import com.dppsmart.dppsmart.Ai.Services.PredictiveAnalyticsService;
import com.dppsmart.dppsmart.Common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class PredictiveAnalyticsController {

    private final PredictiveAnalyticsService predictiveAnalyticsService;

    @GetMapping("/predictive")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ApiResponse<PredictiveAnalysisDto>> analyze(
            @RequestParam(required = false) String organizationId,
            @RequestParam(required = false, defaultValue = "ORG") String scope
    ) {
        PredictiveAnalysisDto result = predictiveAnalyticsService.analyze(organizationId, scope);
        return ResponseEntity.ok(ApiResponse.ok("ok", result));
    }
}