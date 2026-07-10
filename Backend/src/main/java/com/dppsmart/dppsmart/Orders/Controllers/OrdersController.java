package com.dppsmart.dppsmart.Orders.Controllers;

import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.DTO.OrderAvailabilityCheckDTO;
import com.dppsmart.dppsmart.Orders.DTO.OrderProcessResultDTO;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.TechnicalSheetValidationResult;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrdersController {

    private final OrdersService ordersService;
    private final TechnicalSheetValidationService validationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<OrderResponseDto> create(@RequestBody @Valid CreateOrderDto dto) {
        return ResponseEntity.ok(ordersService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> update(@PathVariable String id, @RequestBody @Valid UpdateOrderDto dto) {
        dto.setId(id);
        return ResponseEntity.ok(ordersService.update(dto));
    }

    @PostMapping("/admin/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> adminConfirm(@RequestBody @Valid AdminConfirmOrderDto dto) {
        return ResponseEntity.ok(ordersService.adminConfirm(dto));
    }

    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderProcessResultDTO> processOrder(
            @PathVariable String id,
            @RequestBody @Valid AdminConfirmOrderDto dto) {
        return ResponseEntity.ok(ordersService.processOrder(id, dto));
    }

    @PostMapping("/admin/propose-date")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> adminProposeDate(@RequestBody @Valid AdminProposeDateDto dto) {
        return ResponseEntity.ok(ordersService.adminProposeDate(dto));
    }

    @GetMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderReviewResultDTO> reviewOrder(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.reviewOrder(id));
    }

    @PostMapping("/{id}/launch-production-shortfall")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> launchProductionForShortfall(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.launchProductionForShortfall(id));
    }

    @PostMapping("/{id}/start-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> startProduction(@PathVariable String id) {
        TechnicalSheetValidationResult validation = validationService.validateOrderTechnicalSheets(id);
        if (!validation.isValid()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Technical sheet validation failed",
                    "validation", validation
            ));
        }
        return ResponseEntity.ok(ordersService.startProduction(id));
    }

    @GetMapping("/{id}/availability-check")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderAvailabilityCheckDTO> availabilityCheck(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.availabilityCheck(id));
    }

    @PostMapping("/{id}/confirm-delivery")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> confirmDelivery(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.confirmDelivery(id));
    }

    @PostMapping("/{id}/start-production-v2")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> startProductionV2(@PathVariable String id) {
        TechnicalSheetValidationResult validation = validationService.validateOrderTechnicalSheets(id);
        if (!validation.isValid()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Technical sheet validation failed",
                    "validation", validation
            ));
        }
        return ResponseEntity.ok(ordersService.startProductionWithMaterials(id));
    }

    @PostMapping("/bulk/start-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> bulkStartProduction(@RequestBody List<String> orderIds) {
        List<TechnicalSheetValidationResult> validations = validationService.validateOrdersTechnicalSheets(orderIds);
        List<Map<String, Object>> results = new ArrayList<>();
        int successCount = 0;
        for (int i = 0; i < orderIds.size(); i++) {
            String id = orderIds.get(i);
            TechnicalSheetValidationResult val = validations.get(i);
            if (!val.isValid()) {
                results.add(Map.of("orderId", id, "success", false, "error", "Technical sheet validation failed", "validation", val));
                continue;
            }
            try {
                OrderResponseDto dto = ordersService.startProductionWithMaterials(id);
                successCount++;
                results.add(Map.of("orderId", id, "success", true, "orderReference", dto.getOrderReference()));
            } catch (Exception e) {
                results.add(Map.of("orderId", id, "success", false, "error", e.getMessage()));
            }
        }
        return ResponseEntity.ok(Map.of(
                "successCount", successCount,
                "totalCount", orderIds.size(),
                "results", results
        ));
    }

    @PostMapping("/{id}/ready")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> markReady(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.markReady(id));
    }

    @PostMapping("/{id}/delivered")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> markDelivered(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.markDelivered(id));
    }

    @PostMapping("/client/accept")
    @PreAuthorize("hasAnyRole('CLIENT')")
    public ResponseEntity<OrderResponseDto> clientAccept(@RequestBody @Valid ClientRespondDto dto) {
        return ResponseEntity.ok(ordersService.clientAccept(dto));
    }

    @PostMapping("/client/reject")
    @PreAuthorize("hasAnyRole('CLIENT')")
    public ResponseEntity<OrderResponseDto> clientReject(@RequestBody @Valid ClientRespondDto dto) {
        return ResponseEntity.ok(ordersService.clientReject(dto));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<OrderResponseDto> cancel(@PathVariable String id, @RequestBody(required = false) CancelOrderDto dto) {
        String reason = dto != null ? dto.getReason() : null;
        return ResponseEntity.ok(ordersService.cancel(id, reason));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<List<OrderResponseDto>> getAll(@RequestParam(required = false) Boolean includeAll) {
        return ResponseEntity.ok(ordersService.getAll(includeAll != null && includeAll));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CLIENT')")
    public ResponseEntity<List<OrderResponseDto>> getMyOrders() {
        return ResponseEntity.ok(ordersService.getMyOrders());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<OrderResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.getById(id));
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OrderResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(ordersService.getByOrganization(organizationId));
    }

    @PostMapping("/deliver-by-token/{token}")
    public ResponseEntity<OrderResponseDto> deliverByToken(@PathVariable String token) {
        return ResponseEntity.ok(ordersService.deliverByToken(token));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        ordersService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
