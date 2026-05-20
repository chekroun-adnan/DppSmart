package com.dppsmart.dppsmart.Orders.Controllers;

import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkRequirementsResponseDTO;
import com.dppsmart.dppsmart.Orders.DTO.OrderItemRequirementResponse;
import com.dppsmart.dppsmart.Orders.DTO.SupplyChainOrderRequestDTO;
import com.dppsmart.dppsmart.Orders.Services.BulkOrderMaterialRequirementService;
import com.dppsmart.dppsmart.Orders.Services.OrderMaterialRequirementService;
import com.dppsmart.dppsmart.SupplyChain.DTO.MaterialOrderResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderMaterialRequirementController {

    private final OrderMaterialRequirementService service;
    private final BulkOrderMaterialRequirementService bulkService;

    @GetMapping("/{orderId}/items/{itemIndex}/requirements")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    public ResponseEntity<OrderItemRequirementResponse> getRequirements(
            @PathVariable String orderId,
            @PathVariable int itemIndex) {
        return ResponseEntity.ok(service.getRequirements(orderId, itemIndex));
    }

    @PostMapping("/bulk-requirements")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    public ResponseEntity<BulkRequirementsResponseDTO> getBulkRequirements(
            @RequestBody List<String> orderIds) {
        return ResponseEntity.ok(service.getBulkRequirements(orderIds));
    }

    @PostMapping("/bulk/requirements")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    public ResponseEntity<BulkOrderRequirementResponseDTO> calculateBulkRequirements(
            @RequestBody List<String> orderIds) {
        return ResponseEntity.ok(bulkService.calculate(orderIds));
    }

    @PostMapping("/bulk/requirements/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    public ResponseEntity<BulkOrderRequirementResponseDTO> recalculateBulkRequirements(
            @RequestBody BulkOrderRequirementRequestDTO req) {
        return ResponseEntity.ok(bulkService.recalculate(req));
    }

    @PostMapping("/{orderId}/items/{itemIndex}/supply-order")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> createSupplyOrder(
            @PathVariable String orderId,
            @PathVariable int itemIndex,
            @RequestBody SupplyChainOrderRequestDTO dto) {
        return ResponseEntity.ok(service.createSupplyChainOrder(orderId, itemIndex, dto));
    }
}
