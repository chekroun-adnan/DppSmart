package com.dppsmart.dppsmart.StockMovement.Controllers;

import com.dppsmart.dppsmart.StockMovement.DTO.StockMovementDto;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock-movements")
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementService service;

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<StockMovementDto>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(service.getByOrganization(orgId));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<StockMovementDto>> getByOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(service.getByOrder(orderId));
    }

    @GetMapping("/production/{productionId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<StockMovementDto>> getByProduction(@PathVariable String productionId) {
        return ResponseEntity.ok(service.getByProduction(productionId));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<StockMovementDto>> getByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(service.getByProduct(productId));
    }

    @GetMapping("/material/{materialId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<StockMovementDto>> getByMaterial(@PathVariable String materialId) {
        return ResponseEntity.ok(service.getByMaterial(materialId));
    }
}
