package com.dppsmart.dppsmart.ProductStock.Controllers;

import com.dppsmart.dppsmart.ProductStock.DTO.AdjustProductQuantityDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.CreateProductStockDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.ProductStockResponseDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.UpdateProductStockDTO;
import com.dppsmart.dppsmart.ProductStock.Services.ProductStockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-stock")
@RequiredArgsConstructor
public class ProductStockController {

    private final ProductStockService productStockService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductStockResponseDTO> create(@RequestBody @Valid CreateProductStockDTO dto) {
        return ResponseEntity.ok(productStockService.create(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ProductStockResponseDTO>> getAll() {
        return ResponseEntity.ok(productStockService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductStockResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(productStockService.getById(id));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductStockResponseDTO> update(@RequestBody @Valid UpdateProductStockDTO dto) {
        return ResponseEntity.ok(productStockService.update(dto));
    }

    @PutMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductStockResponseDTO> adjustQuantity(@RequestBody @Valid AdjustProductQuantityDTO dto) {
        return ResponseEntity.ok(productStockService.adjustQuantity(dto));
    }

    @PostMapping("/from-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductStockResponseDTO> addFromProduction(
            @RequestParam String productName,
            @RequestParam String productId,
            @RequestParam int quantity,
            @RequestParam(required = false, defaultValue = "units") String unit,
            @RequestParam String organizationId) {
        return ResponseEntity.ok(productStockService.addFromProduction(productName, productId, quantity, unit, organizationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        productStockService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
