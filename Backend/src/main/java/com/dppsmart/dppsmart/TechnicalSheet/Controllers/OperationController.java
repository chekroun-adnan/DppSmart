package com.dppsmart.dppsmart.TechnicalSheet.Controllers;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.CreateOperationDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.OperationResponseDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.UpdateOperationDto;
import com.dppsmart.dppsmart.TechnicalSheet.Services.OperationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ts-operations")
@RequiredArgsConstructor
public class OperationController {

    private final OperationService operationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationResponseDto> create(@RequestBody @Valid CreateOperationDto dto) {
        return ResponseEntity.ok(operationService.create(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationResponseDto>> getAll() {
        return ResponseEntity.ok(operationService.getAll());
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationResponseDto>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(operationService.getByOrg(orgId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationResponseDto> update(@PathVariable String id,
                                                       @RequestBody UpdateOperationDto dto) {
        return ResponseEntity.ok(operationService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        operationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
