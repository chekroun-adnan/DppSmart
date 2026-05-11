package com.dppsmart.dppsmart.SupplyChain.Controllers;

import com.dppsmart.dppsmart.SupplyChain.DTO.CreateSupplierDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.SupplierResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.UpdateSupplierDTO;
import com.dppsmart.dppsmart.SupplyChain.Services.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SupplierResponseDTO> create(@RequestBody @Valid CreateSupplierDTO dto) {
        return ResponseEntity.ok(supplierService.create(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<SupplierResponseDTO>> getAll() {
        return ResponseEntity.ok(supplierService.getAll());
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<SupplierResponseDTO>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(supplierService.getByOrg(orgId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<SupplierResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(supplierService.getById(id));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SupplierResponseDTO> update(@RequestBody @Valid UpdateSupplierDTO dto) {
        return ResponseEntity.ok(supplierService.update(dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
