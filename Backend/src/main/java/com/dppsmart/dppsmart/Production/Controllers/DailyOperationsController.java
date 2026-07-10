package com.dppsmart.dppsmart.Production.Controllers;

import com.dppsmart.dppsmart.Production.DTO.DailyOperationDto;
import com.dppsmart.dppsmart.Production.Services.DailyOperationPlanningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/production/operations")
public class DailyOperationsController {

    @Autowired
    private DailyOperationPlanningService dailyOperationPlanningService;

    @GetMapping("/daily")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public List<DailyOperationDto> getDailyOperations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) String status) {
        return dailyOperationPlanningService.getDailyOperations(date, department, employeeId, status);
    }

    @GetMapping("/daily/counts")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public Map<String, Long> getDepartmentCounts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String department) {
        return dailyOperationPlanningService.getDepartmentCounts(date, department);
    }
}
