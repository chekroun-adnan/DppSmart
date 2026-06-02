package com.dppsmart.dppsmart.Orders.Controllers;

import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.DTO.OrderAvailabilityCheckDTO;
import com.dppsmart.dppsmart.Orders.DTO.OrderProcessResultDTO;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
import com.dppsmart.dppsmart.Orders.Services.OrderWorkflowService;
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
    private final OrderWorkflowService orderWorkflowService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<OrderResponseDto> create(@RequestBody @Valid CreateOrderDto dto) {
        return ResponseEntity.ok(ordersService.create(dto));
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
    public ResponseEntity<OrderResponseDto> startProduction(@PathVariable String id) {
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
    public ResponseEntity<OrderResponseDto> startProductionV2(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.startProductionWithMaterials(id));
    }

    @PostMapping("/bulk/start-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> bulkStartProduction(@RequestBody List<String> orderIds) {
        List<Map<String, Object>> results = new ArrayList<>();
        int successCount = 0;
        for (String id : orderIds) {
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
    public ResponseEntity<List<OrderResponseDto>> getAll() {
        return ResponseEntity.ok(ordersService.getAll());
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

    @PostMapping("/{id}/workflow/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> workflowConfirm(
            @PathVariable String id,
            @RequestBody ConfirmWorkflowDto dto) {
        return ResponseEntity.ok(orderWorkflowService.confirmOrder(
                id, dto.getConfirmedDeliveryDate(), dto.getPriority(), dto.getAdminMessage()));
    }

    @PostMapping("/{id}/workflow/set-priority")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> workflowSetPriority(
            @PathVariable String id,
            @RequestBody @Valid SetPriorityDto dto) {
        return ResponseEntity.ok(orderWorkflowService.setPriority(id, dto.getPriority()));
    }

    @PostMapping("/{id}/workflow/request-delivery-date")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> workflowRequestDeliveryDate(
            @PathVariable String id,
            @RequestBody @Valid RequestDeliveryDateDto dto) {
        return ResponseEntity.ok(orderWorkflowService.requestDeliveryDate(id, dto.getProposedDate(), dto.getMessage()));
    }

    @GetMapping("/{id}/workflow/check-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<WorkflowStockCheckResult> workflowCheckStock(@PathVariable String id) {
        return ResponseEntity.ok(orderWorkflowService.checkStock(id));
    }

    @GetMapping("/{id}/workflow/simulate")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SimulationResult> workflowSimulate(@PathVariable String id) {
        return ResponseEntity.ok(orderWorkflowService.simulate(id));
    }

    @PostMapping("/{id}/workflow/process")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderProcessResultDTO> workflowProcess(
            @PathVariable String id,
            @RequestBody(required = false) ConfirmWorkflowDto dto) {
        java.time.LocalDate date = dto != null ? dto.getConfirmedDeliveryDate() : null;
        return ResponseEntity.ok(orderWorkflowService.processOrderFull(id, date));
    }

    @PostMapping("/{id}/workflow/deliver")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> workflowDeliver(@PathVariable String id) {
        return ResponseEntity.ok(orderWorkflowService.deliverOrder(id));
    }

    @PostMapping("/workflow/complete-production/{productionId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> workflowCompleteProduction(@PathVariable String productionId) {
        return ResponseEntity.ok(orderWorkflowService.completeProduction(productionId));
    }

    @PostMapping("/{id}/cancel-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> cancelProduction(
            @PathVariable String id,
            @RequestBody @Valid CancelProductionDto dto) {
        return ResponseEntity.ok(orderWorkflowService.cancelProduction(id, dto.getAction(), dto.getMessage()));
    }

    @GetMapping("/{id}/workflow/materials")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialsBreakdownResult> workflowMaterials(@PathVariable String id) {
        return ResponseEntity.ok(orderWorkflowService.getMaterialsBreakdown(id));
    }

}
