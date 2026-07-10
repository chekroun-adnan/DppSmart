package com.dppsmart.dppsmart.Task.Controllers;

import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Task.DTO.*;
import com.dppsmart.dppsmart.Task.Services.TaskService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TaskResponseDto> create(@RequestBody @Valid CreateTaskDto dto) {
        return ResponseEntity.ok(taskService.create(dto));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TaskResponseDto> update(@RequestBody @Valid UpdateTaskDto dto) {
        return ResponseEntity.ok(taskService.update(dto));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<TaskResponseDto> updateStatus(
            @PathVariable String id,
            @RequestBody @Valid UpdateTaskStatusDto dto) {
        return ResponseEntity.ok(taskService.updateStatus(id, dto));
    }

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<?> reportProgress(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        int quantity = body.get("quantity") != null ? ((Number) body.get("quantity")).intValue() : 0;
        String notes = body.get("notes") != null ? body.get("notes").toString() : "";
        taskService.reportProgress(id, quantity, notes);
        return ResponseEntity.ok(Map.of("message", "Progress reported"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<TaskResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(taskService.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<TaskResponseDto>> getAll() {
        return ResponseEntity.ok(taskService.getAll());
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<TaskResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(taskService.getByOrganization(organizationId));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<TaskResponseDto>> getByEmployee(@PathVariable String employeeId) {
        return ResponseEntity.ok(taskService.getByEmployee(employeeId));
    }

    @GetMapping("/dashboard/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TaskDashboardDto> getDashboard(@PathVariable String organizationId) {
        return ResponseEntity.ok(taskService.getDashboard(organizationId));
    }

    @GetMapping("/overdue/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OverdueTaskDto>> getOverdueTasks(@PathVariable String organizationId) {
        return ResponseEntity.ok(taskService.getOverdueTasks(organizationId));
    }

    @GetMapping("/my-dashboard")
    @PreAuthorize("hasAnyRole('EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> getMyDashboard(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(taskService.getEmployeeDashboard(user.getId(), user.getOrganizationId()));
    }

    @GetMapping("/my-tasks")
    @PreAuthorize("hasAnyRole('EMPLOYEE')")
    public ResponseEntity<List<TaskResponseDto>> getMyTasks(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(taskService.getByEmployee(user.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
