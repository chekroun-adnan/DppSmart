package com.dppsmart.dppsmart.Employee.Controllers;

import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.Services.EmployeesService;
import com.dppsmart.dppsmart.Production.DTO.OperationIssueDto;
import com.dppsmart.dppsmart.Production.Entities.ProductionProgressLog;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import com.dppsmart.dppsmart.Production.Repositories.OperationIssueRepository;
import com.dppsmart.dppsmart.Production.Repositories.ProductionProgressLogRepository;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.Production.Services.ProductionOrderService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee")
@PreAuthorize("hasRole('EMPLOYEE')")
public class EmployeeController {

    @Autowired private EmployeesService employeesService;
    @Autowired private ProductionStepEntityRepository stepRepo;
    @Autowired private ProductionOrderService productionOrderService;
    @Autowired private OperationIssueRepository issueRepo;
    @Autowired private ProductionProgressLogRepository progressLogRepo;
    @Autowired private UserRepository userRepository;

    // ─── Dashboard ─────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        String employeeId = getCurrentEmployeeId();
        LocalDate today = LocalDate.now();

        List<ProductionStepEntity> allSteps = stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId);
        List<ProductionStepEntity> todaySteps = allSteps.stream()
                .filter(s -> s.getPlannedStartTime() != null
                        && s.getPlannedStartTime().toLocalDate().equals(today))
                .collect(Collectors.toList());

        long inProgress = allSteps.stream().filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS).count();
        long overdue = allSteps.stream().filter(s -> s.getStatus() == ProductionStepStatus.OVERDUE
                || (s.getStatus() == ProductionStepStatus.PLANNED && s.getPlannedEndTime() != null
                && s.getPlannedEndTime().isBefore(LocalDateTime.now()))).count();
        long completedToday = allSteps.stream().filter(s -> s.getStatus() == ProductionStepStatus.COMPLETED
                && s.getCompletedAt() != null && s.getCompletedAt().toLocalDate().equals(today)).count();
        int producedToday = allSteps.stream()
                .filter(s -> s.getCompletedQuantity() != null && s.getCompletedAt() != null
                        && s.getCompletedAt().toLocalDate().equals(today))
                .mapToInt(s -> s.getCompletedQuantity() != null ? s.getCompletedQuantity() : 0)
                .sum();

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("tasksAssignedToday", todaySteps.size());
        kpis.put("operationsInProgress", inProgress);
        kpis.put("overdueTasks", overdue);
        kpis.put("completedToday", completedToday);
        kpis.put("producedQuantityToday", producedToday);

        List<Map<String, Object>> upcoming = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.PLANNED || s.getStatus() == ProductionStepStatus.READY)
                .limit(5)
                .map(this::stepToBrief)
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kpis", kpis);
        result.put("upcomingSteps", upcoming);
        return result;
    }

    // ─── My Operations (detailed steps) ────────────────────────────────────

    @GetMapping("/operations")
    public List<Map<String, Object>> getMyOperations() {
        String employeeId = getCurrentEmployeeId();
        return stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId).stream()
                .map(this::stepToDetail)
                .collect(Collectors.toList());
    }

    // ─── Today's Schedule ──────────────────────────────────────────────────

    @GetMapping("/schedule/today")
    public List<Map<String, Object>> getTodaySchedule() {
        String employeeId = getCurrentEmployeeId();
        LocalDate today = LocalDate.now();
        return stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId).stream()
                .filter(s -> s.getPlannedStartTime() != null
                        && s.getPlannedStartTime().toLocalDate().equals(today))
                .map(this::stepToSchedule)
                .sorted(Comparator.comparing(m -> (LocalTime) m.get("plannedStart")))
                .collect(Collectors.toList());
    }

    // ─── Production Queue ──────────────────────────────────────────────────

    @GetMapping("/queue")
    public Map<String, Object> getQueue() {
        String employeeId = getCurrentEmployeeId();
        List<ProductionStepEntity> all = stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId);

        List<Map<String, Object>> ready = all.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.READY || s.getStatus() == ProductionStepStatus.PLANNED)
                .map(this::stepToBrief)
                .collect(Collectors.toList());

        List<Map<String, Object>> inProgress = all.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS)
                .map(this::stepToBrief)
                .collect(Collectors.toList());

        List<Map<String, Object>> overdue = all.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.OVERDUE
                        || s.getDelayStatus() != null && s.getDelayStatus().equals("DELAYED")
                        || (s.getStatus() == ProductionStepStatus.PLANNED
                        && s.getPlannedEndTime() != null && s.getPlannedEndTime().isBefore(LocalDateTime.now())))
                .map(this::stepToBrief)
                .collect(Collectors.toList());

        // Sort overdue by priority/delay
        overdue.sort((a, b) -> {
            int pa = ((Number) a.getOrDefault("priority", 0)).intValue();
            int pb = ((Number) b.getOrDefault("priority", 0)).intValue();
            return Integer.compare(pb, pa);
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ready", ready);
        result.put("inProgress", inProgress);
        result.put("overdue", overdue);
        return result;
    }

    // ─── Issues ────────────────────────────────────────────────────────────

    @GetMapping("/issues")
    public List<OperationIssueDto> getMyIssues() {
        String employeeId = getCurrentEmployeeId();
        List<ProductionStepEntity> mySteps = stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId);
        List<OperationIssueDto> all = new ArrayList<>();
        for (ProductionStepEntity step : mySteps) {
            List<OperationIssueDto> issues = productionOrderService.getStepIssues(step.getId());
            all.addAll(issues);
        }
        all.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return all;
    }

    @PostMapping("/issues")
    public OperationIssueDto createIssue(@RequestBody @Valid EmployeeIssueRequest request) {
        User user = getCurrentUser();
        return productionOrderService.createIssue(request.getStepId(), request.getIssueType(),
                request.getTitle(), request.getDescription(), user);
    }

    // ─── Operation Notes ───────────────────────────────────────────────────

    @PostMapping("/notes")
    public Map<String, Object> addNote(@RequestBody @Valid AddNoteRequest request) {
        ProductionStepEntity step = stepRepo.findById(request.getStepId())
                .orElseThrow(() -> new RuntimeException("Step not found: " + request.getStepId()));
        User user = getCurrentUser();

        ProductionProgressLog log = new ProductionProgressLog();
        log.setStepId(step.getId());
        log.setOrderId(step.getOrderId());
        log.setDepartment(step.getResponsibleDepartment());
        log.setAction("NOTE");
        log.setNotes(request.getNote());
        log.setReportedBy(user.getId());
        log.setReportedByName(user.getName() != null ? user.getName() : user.getEmail());
        log.setTimestamp(LocalDateTime.now());
        log.setCompletedQuantity(step.getCompletedQuantity());
        log.setRemainingQuantity(step.getRemainingQuantity());
        log.setCompletionPercentage(step.getCompletionPercentage());
        progressLogRepo.save(log);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", log.getId());
        result.put("stepId", step.getId());
        result.put("note", request.getNote());
        result.put("createdAt", log.getTimestamp());
        return result;
    }

    @GetMapping("/notes/{stepId}")
    public List<ProductionProgressLog> getNotes(@PathVariable String stepId) {
        return progressLogRepo.findByStepIdOrderByTimestampAsc(stepId).stream()
                .filter(l -> "NOTE".equals(l.getAction()))
                .collect(Collectors.toList());
    }

    // ─── Performance ───────────────────────────────────────────────────────

    @GetMapping("/performance")
    public Map<String, Object> getPerformance() {
        String employeeId = getCurrentEmployeeId();
        List<ProductionStepEntity> allSteps = stepRepo.findByAssignedEmployeeOrderByPlannedStartTimeAsc(employeeId);
        List<ProductionStepEntity> completed = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.COMPLETED)
                .collect(Collectors.toList());

        int totalCompleted = completed.size();
        int totalQuantity = completed.stream()
                .mapToInt(s -> s.getCompletedQuantity() != null ? s.getCompletedQuantity() : 0)
                .sum();
        double avgCompletion = completed.stream()
                .filter(s -> s.getCompletionPercentage() != null)
                .mapToDouble(ProductionStepEntity::getCompletionPercentage)
                .average().orElse(0);

        int totalAssigned = allSteps.size();
        double productivity = totalAssigned > 0 ? (double) totalCompleted / totalAssigned * 100 : 0;

        // Group by operation
        Map<String, Long> byOperation = completed.stream()
                .filter(s -> s.getOperationName() != null)
                .collect(Collectors.groupingBy(
                        ProductionStepEntity::getOperationName,
                        Collectors.counting()
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("completedOperations", totalCompleted);
        result.put("completedQuantity", totalQuantity);
        result.put("averageCompletionPct", Math.round(avgCompletion * 10.0) / 10.0);
        result.put("productivity", Math.round(productivity * 10.0) / 10.0);
        result.put("assignedTasks", totalAssigned);
        result.put("byOperation", byOperation);
        return result;
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private Map<String, Object> stepToBrief(ProductionStepEntity s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("operationName", s.getOperationName());
        m.put("productName", s.getProductName());
        m.put("status", s.getStatus());
        m.put("requiredQuantity", s.getOrderQuantity());
        m.put("completedQuantity", s.getCompletedQuantity());
        m.put("remainingQuantity", s.getRemainingQuantity());
        m.put("completionPercentage", s.getCompletionPercentage());
        m.put("plannedStartTime", s.getPlannedStartTime());
        m.put("plannedEndTime", s.getPlannedEndTime());
        m.put("delayStatus", s.getDelayStatus());
        m.put("healthScore", s.getHealthScore());
        m.put("priority", 0);
        return m;
    }

    private Map<String, Object> stepToDetail(ProductionStepEntity s) {
        Map<String, Object> m = stepToBrief(s);
        m.put("productionOrderId", s.getProductionOrderId());
        m.put("orderId", s.getOrderId());
        m.put("operationId", s.getOperationId());
        m.put("durationPerUnit", s.getDurationPerUnit());
        m.put("durationUnit", s.getDurationUnit());
        m.put("totalDuration", s.getTotalDuration());
        m.put("instructions", s.getInstructions());
        m.put("requiredResources", s.getRequiredResources());
        m.put("qualityCheckRequired", s.getQualityCheckRequired());
        m.put("startedAt", s.getStartedAt());
        m.put("completedAt", s.getCompletedAt());
        m.put("plannedDurationMinutes", s.getPlannedDurationMinutes());
        m.put("actualDurationMinutes", s.getActualDurationMinutes());
        m.put("remainingDurationMinutes", s.getRemainingDurationMinutes());
        m.put("assignedEmployeeName", s.getAssignedEmployeeName());
        return m;
    }

    private Map<String, Object> stepToSchedule(ProductionStepEntity s) {
        Map<String, Object> m = stepToBrief(s);
        m.put("plannedStart", s.getPlannedStartTime() != null ? s.getPlannedStartTime().toLocalTime() : null);
        m.put("plannedEnd", s.getPlannedEndTime() != null ? s.getPlannedEndTime().toLocalTime() : null);
        String period;
        if (s.getStatus() == ProductionStepStatus.COMPLETED) period = "completed";
        else if (s.getStatus() == ProductionStepStatus.IN_PROGRESS) period = "current";
        else period = "upcoming";
        m.put("period", period);
        return m;
    }

    private String getCurrentEmployeeId() {
        User user = getCurrentUser();
        return user.getId();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Data
    public static class AddNoteRequest {
        @NotBlank
        private String stepId;
        @NotBlank
        private String note;
    }

    @Data
    public static class EmployeeIssueRequest {
        @NotBlank
        private String stepId;
        @NotBlank
        private String issueType;
        @NotBlank
        private String title;
        private String description;
    }
}
