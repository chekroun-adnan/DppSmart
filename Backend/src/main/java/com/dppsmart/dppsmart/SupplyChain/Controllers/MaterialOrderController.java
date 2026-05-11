package com.dppsmart.dppsmart.SupplyChain.Controllers;

import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Services.MaterialOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/material-orders")
@RequiredArgsConstructor
public class MaterialOrderController {

    private final MaterialOrderService orderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> createOrder(@RequestBody @Valid CreateMaterialOrderDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<MaterialOrderResponseDTO>> getAll() {
        return ResponseEntity.ok(orderService.getAll());
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<MaterialOrderResponseDTO>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(orderService.getByOrg(orgId));
    }

    @GetMapping("/organization/{orgId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<MaterialOrderResponseDTO>> getByStatus(@PathVariable String orgId, @PathVariable String status) {
        return ResponseEntity.ok(orderService.getByStatus(orgId, status));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<MaterialOrderResponseDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> updateOrder(@PathVariable String id, @RequestBody UpdateMaterialOrderDTO dto) {
        return ResponseEntity.ok(orderService.updateOrder(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> deleteOrder(@PathVariable String id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    // Tracking
    @PostMapping("/{orderId}/tracking")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<TrackingResponseDTO> updateTracking(@PathVariable String orderId, @RequestBody @Valid CreateTrackingDTO dto) {
        return ResponseEntity.ok(orderService.updateTracking(orderId, dto));
    }

    @GetMapping("/{orderId}/tracking")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<TrackingResponseDTO>> getTrackingHistory(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.getTrackingHistory(orderId));
    }

    // Reception
    @PostMapping("/{orderId}/reception")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ReceptionResponseDTO> validateReception(@PathVariable String orderId, @RequestBody @Valid CreateReceptionDTO dto) {
        dto.setMaterialOrderId(orderId);
        return ResponseEntity.ok(orderService.validateReception(dto));
    }

    @GetMapping("/{orderId}/receptions")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<ReceptionResponseDTO>> getReceptions(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.getReceptions(orderId));
    }

    // Return
    @PostMapping("/{orderId}/return")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> processReturn(
            @PathVariable String orderId,
            @RequestParam String itemId,
            @RequestParam int returnQuantity,
            @RequestParam String rejectionReason,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(orderService.processReturn(orderId, itemId, returnQuantity, rejectionReason, notes));
    }
}
