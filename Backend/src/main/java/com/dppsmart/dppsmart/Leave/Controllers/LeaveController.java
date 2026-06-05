package com.dppsmart.dppsmart.Leave.Controllers;

import com.dppsmart.dppsmart.Leave.DTO.CreateLeaveRequestDto;
import com.dppsmart.dppsmart.Leave.DTO.LeaveResponseDto;
import com.dppsmart.dppsmart.Leave.Services.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<LeaveResponseDto> create(@RequestBody @Valid CreateLeaveRequestDto dto) {
        return ResponseEntity.ok(leaveService.create(dto));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<LeaveResponseDto> approve(@PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(leaveService.approve(id, body != null ? body.get("reason") : null));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<LeaveResponseDto> reject(@PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(leaveService.reject(id, body != null ? body.get("reason") : null));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<LeaveResponseDto>> getAll() {
        return ResponseEntity.ok(leaveService.getAll());
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<LeaveResponseDto>> getByEmployee(@PathVariable String employeeId) {
        return ResponseEntity.ok(leaveService.getByEmployee(employeeId));
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<LeaveResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(leaveService.getByOrganization(organizationId));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LeaveResponseDto>> getMyLeaves() {
        return ResponseEntity.ok(leaveService.getMyLeaves());
    }
}
