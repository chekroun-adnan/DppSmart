package com.dppsmart.dppsmart.Employee.Controllers;

import com.dppsmart.dppsmart.Employee.DTO.CreateEmployeeDto;
import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.DTO.UpdateEmployeeDto;
import com.dppsmart.dppsmart.Employee.Services.EmployeesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeesController {
    private final EmployeesService employeesService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<EmployeeResponseDto> create(@RequestBody @Valid CreateEmployeeDto dto) {
        return ResponseEntity.ok(employeesService.create(dto));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<EmployeeResponseDto> update(@RequestBody @Valid UpdateEmployeeDto dto) {
        return ResponseEntity.ok(employeesService.update(dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<EmployeeResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(employeesService.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<EmployeeResponseDto>> getAll() {
        return ResponseEntity.ok(employeesService.getAll());
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<EmployeeResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(employeesService.getByOrganization(organizationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        employeesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

