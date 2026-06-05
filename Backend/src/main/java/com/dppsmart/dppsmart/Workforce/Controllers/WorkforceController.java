package com.dppsmart.dppsmart.Workforce.Controllers;

import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Workforce.DTO.EmployeePerformanceDto;
import com.dppsmart.dppsmart.Workforce.DTO.EmployeeWorkloadDto;
import com.dppsmart.dppsmart.Workforce.DTO.WorkforcePlanDto;
import com.dppsmart.dppsmart.Workforce.Services.EmployeePerformanceService;
import com.dppsmart.dppsmart.Workforce.Services.EmployeeWorkloadService;
import com.dppsmart.dppsmart.Workforce.Services.WorkforceAiService;
import com.dppsmart.dppsmart.Workforce.Services.WorkforcePlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workforce")
@RequiredArgsConstructor
public class WorkforceController {

    private final EmployeeWorkloadService workloadService;
    private final EmployeePerformanceService performanceService;
    private final WorkforcePlanningService planningService;
    private final WorkforceAiService aiService;

    @GetMapping("/employees/{employeeId}/workload")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<EmployeeWorkloadDto> getWorkload(@PathVariable String employeeId) {
        return ResponseEntity.ok(workloadService.getWorkload(employeeId));
    }

    @GetMapping("/employees/{employeeId}/performance")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<EmployeePerformanceDto> getPerformance(@PathVariable String employeeId) {
        return ResponseEntity.ok(performanceService.getPerformance(employeeId));
    }

    @GetMapping("/planning")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<WorkforcePlanDto> getPlan(@RequestParam String organizationId) {
        WorkforcePlanDto plan = planningService.getPlan(organizationId);
        plan.setAiRecommendation(aiService.generateRecommendation(plan));
        return ResponseEntity.ok(plan);
    }
}
