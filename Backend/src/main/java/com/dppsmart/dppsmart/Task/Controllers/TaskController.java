package com.dppsmart.dppsmart.Task.Controllers;

import com.dppsmart.dppsmart.Task.DTO.CreateTaskDto;
import com.dppsmart.dppsmart.Task.DTO.TaskResponseDto;
import com.dppsmart.dppsmart.Task.DTO.UpdateTaskDto;
import com.dppsmart.dppsmart.Task.DTO.UpdateTaskStatusDto;
import com.dppsmart.dppsmart.Task.Services.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
