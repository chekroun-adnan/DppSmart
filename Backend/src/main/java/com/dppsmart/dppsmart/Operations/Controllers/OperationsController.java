package com.dppsmart.dppsmart.Operations.Controllers;

import com.dppsmart.dppsmart.Operations.DTO.CreateOperationRequest;
import com.dppsmart.dppsmart.Operations.DTO.OperationDTO;
import com.dppsmart.dppsmart.Operations.DTO.UpdateOperationRequest;
import com.dppsmart.dppsmart.Operations.Services.OperationsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
public class OperationsController {

    private final OperationsService operationsService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationDTO> create(@RequestBody @Valid CreateOperationRequest req) {
        return ResponseEntity.ok(operationsService.create(req));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationDTO>> getAll() {
        return ResponseEntity.ok(operationsService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(operationsService.getById(id));
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationDTO>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(operationsService.getByOrg(orgId));
    }

    @GetMapping("/organization/{orgId}/active")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationDTO>> getActiveByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(operationsService.getActiveByOrg(orgId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationDTO> update(@PathVariable String id,
                                               @RequestBody @Valid UpdateOperationRequest req) {
        return ResponseEntity.ok(operationsService.update(id, req));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationDTO> deactivate(@PathVariable String id) {
        return ResponseEntity.ok(operationsService.deactivate(id));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OperationDTO> activate(@PathVariable String id) {
        return ResponseEntity.ok(operationsService.activate(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        operationsService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
