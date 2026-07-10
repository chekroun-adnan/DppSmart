package com.dppsmart.dppsmart.Production.Controllers;

import com.dppsmart.dppsmart.Production.DTO.*;
import com.dppsmart.dppsmart.Production.Services.ProductionOrderService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/production/orders")
public class ProductionOrderController {

    @Autowired
    private ProductionOrderService productionOrderService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<OrderProductionDto> getProductionOrders() {
        return productionOrderService.getProductionOrders();
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public OrderProductionDto getOrderProduction(@PathVariable String orderId) {
        return productionOrderService.getOrderProduction(orderId);
    }

    @GetMapping("/{orderId}/steps")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductionStepDto> getSteps(@PathVariable String orderId) {
        return productionOrderService.getSteps(orderId);
    }

    @PostMapping("/{orderId}/generate-steps")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public GenerateStepsResponse generateSteps(@PathVariable String orderId) {
        return productionOrderService.generateSteps(orderId);
    }

    @PostMapping("/steps/{stepId}/start")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto startStep(@PathVariable String stepId) {
        return productionOrderService.startStep(stepId);
    }

    @PostMapping("/steps/{stepId}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto completeStep(@PathVariable String stepId) {
        return productionOrderService.completeStep(stepId);
    }

    @PostMapping("/steps/{stepId}/block")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto blockStep(
            @PathVariable String stepId,
            @RequestBody @Valid BlockStepRequest request) {
        return productionOrderService.blockStep(stepId, request.getReason());
    }

    @PostMapping("/steps/{stepId}/skip")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto skipStep(@PathVariable String stepId) {
        return productionOrderService.skipStep(stepId);
    }

    // ─── Issues ───────────────────────────────────────────────────────────

    @PostMapping("/steps/{stepId}/issues")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public OperationIssueDto createIssue(
            @PathVariable String stepId,
            @RequestBody @Valid CreateIssueRequest request) {
        User user = getCurrentUser();
        return productionOrderService.createIssue(stepId, request.getIssueType(),
                request.getTitle(), request.getDescription(), user);
    }

    @PutMapping("/issues/{issueId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public OperationIssueDto resolveIssue(@PathVariable String issueId) {
        User user = getCurrentUser();
        return productionOrderService.resolveIssue(issueId, user);
    }

    @GetMapping("/steps/{stepId}/issues")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<OperationIssueDto> getStepIssues(@PathVariable String stepId) {
        return productionOrderService.getStepIssues(stepId);
    }

    // ─── Department Queues ────────────────────────────────────────────────

    @GetMapping("/department-queues")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<DepartmentQueueDto> getDepartmentQueues(
            @RequestParam(required = false) String department) {
        return productionOrderService.getDepartmentQueues(department);
    }

    // ─── KPI Dashboard ────────────────────────────────────────────────────

    @GetMapping("/kpi-dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public KpiDashboardDto getKpiDashboard() {
        return productionOrderService.getKpiDashboard();
    }

    // ─── WIP / Progress Reporting ──────────────────────────────────────────

    @PostMapping("/steps/{stepId}/progress")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ProductionStepDto reportProgress(
            @PathVariable String stepId,
            @RequestBody @Valid ReportProgressRequest request) {
        User user = getCurrentUser();
        return productionOrderService.reportProgress(stepId, request.getQuantity(),
                request.getNotes(), request.isMarkComplete(), user);
    }

    @GetMapping("/steps/{stepId}/progress-history")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public List<ProgressLogDto> getProgressHistory(@PathVariable String stepId) {
        return productionOrderService.getProgressHistory(stepId);
    }

    // ─── Migration ─────────────────────────────────────────────────────────

    @PostMapping("/backfill-wip")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> backfillWipFields() {
        int count = productionOrderService.backfillWipFields();
        return ResponseEntity.ok(Map.of("updated", count, "message", "Backfilled WIP fields for " + count + " steps"));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
