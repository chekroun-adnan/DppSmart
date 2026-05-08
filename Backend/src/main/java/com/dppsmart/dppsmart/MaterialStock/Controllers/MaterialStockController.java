package com.dppsmart.dppsmart.MaterialStock.Controllers;

import com.dppsmart.dppsmart.Common.ApiResponse;
import com.dppsmart.dppsmart.MaterialStock.DTO.AdjustMaterialQuantityDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.CreateMaterialStockDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.MaterialStockResponseDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.UpdateMaterialStockDTO;
import com.dppsmart.dppsmart.MaterialStock.Services.MaterialStockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/material-stock")
@RequiredArgsConstructor
public class MaterialStockController {

    private final MaterialStockService materialStockService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialStockResponseDTO> create(@RequestBody @Valid CreateMaterialStockDTO dto) {
        return ResponseEntity.ok(materialStockService.create(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialStockResponseDTO>> getAll() {
        return ResponseEntity.ok(materialStockService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialStockResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(materialStockService.getById(id));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialStockResponseDTO> update(@RequestBody @Valid UpdateMaterialStockDTO dto) {
        return ResponseEntity.ok(materialStockService.update(dto));
    }

    @PutMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialStockResponseDTO> adjustQuantity(@RequestBody @Valid AdjustMaterialQuantityDTO dto) {
        return ResponseEntity.ok(materialStockService.adjustQuantity(dto));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialStockResponseDTO>> getLowStock(
            @RequestParam(required = false) String organizationId) {
        return ResponseEntity.ok(materialStockService.getLowStockItems(organizationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        materialStockService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
