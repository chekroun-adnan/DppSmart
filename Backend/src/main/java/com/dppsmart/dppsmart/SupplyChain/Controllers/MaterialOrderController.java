package com.dppsmart.dppsmart.SupplyChain.Controllers;

import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Services.*;
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
    private final DeliveryService deliveryService;
    private final ReturnRequestService returnRequestService;
    private final DisputeService disputeService;
    private final SupplierDiscussionService discussionService;

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

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> approveOrder(@PathVariable String id) {
        UpdateMaterialOrderDTO dto = new UpdateMaterialOrderDTO();
        dto.setStatus("APPROVED");
        return ResponseEntity.ok(orderService.updateOrder(id, dto));
    }

    @PostMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> markAsShipped(@PathVariable String id) {
        UpdateMaterialOrderDTO dto = new UpdateMaterialOrderDTO();
        dto.setStatus("SHIPPED");
        return ResponseEntity.ok(orderService.updateOrder(id, dto));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialOrderResponseDTO> markAsCompleted(@PathVariable String id) {
        UpdateMaterialOrderDTO dto = new UpdateMaterialOrderDTO();
        dto.setStatus("COMPLETED");
        return ResponseEntity.ok(orderService.updateOrder(id, dto));
    }

    // Delivery management
    @PostMapping("/{orderId}/deliveries")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<DeliveryResponseDTO> createDelivery(@PathVariable String orderId, @RequestBody @Valid CreateDeliveryDTO dto) {
        dto.setMaterialOrderId(orderId);
        return ResponseEntity.ok(deliveryService.createDelivery(dto));
    }

    @GetMapping("/{orderId}/deliveries")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<DeliveryResponseDTO>> getDeliveries(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveriesByOrder(orderId));
    }

    @GetMapping("/deliveries/{deliveryId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DeliveryResponseDTO> getDelivery(@PathVariable String deliveryId) {
        return ResponseEntity.ok(deliveryService.getById(deliveryId));
    }

    @PostMapping("/deliveries/{deliveryId}/receive")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DeliveryResponseDTO> receiveDelivery(@PathVariable String deliveryId, @RequestBody @Valid ReceivingInspectionDTO dto) {
        dto.setDeliveryId(deliveryId);
        return ResponseEntity.ok(deliveryService.receiveDelivery(deliveryId, dto));
    }

    // Return requests
    @PostMapping("/{orderId}/returns")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ReturnRequestResponseDTO> createReturn(@PathVariable String orderId, @RequestBody @Valid CreateReturnRequestDTO dto) {
        dto.setPurchaseOrderId(orderId);
        return ResponseEntity.ok(returnRequestService.createReturnRequest(dto));
    }

    @GetMapping("/{orderId}/returns")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<ReturnRequestResponseDTO>> getReturns(@PathVariable String orderId) {
        return ResponseEntity.ok(returnRequestService.getReturnsByOrder(orderId));
    }

    @GetMapping("/returns/{returnId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ReturnRequestResponseDTO> getReturn(@PathVariable String returnId) {
        return ResponseEntity.ok(returnRequestService.getById(returnId));
    }

    @PutMapping("/returns/{returnId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ReturnRequestResponseDTO> updateReturn(@PathVariable String returnId, @RequestBody UpdateReturnRequestDTO dto) {
        return ResponseEntity.ok(returnRequestService.updateReturnRequest(returnId, dto));
    }

    @GetMapping("/returns/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<ReturnRequestResponseDTO>> getReturnsByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(returnRequestService.getReturnsByOrg(orgId));
    }

    // Disputes
    @PostMapping("/{orderId}/disputes")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DisputeResponseDTO> createDispute(@PathVariable String orderId, @RequestBody @Valid CreateDisputeDTO dto) {
        dto.setPurchaseOrderId(orderId);
        return ResponseEntity.ok(disputeService.createDispute(dto));
    }

    @GetMapping("/{orderId}/disputes")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<DisputeResponseDTO>> getDisputes(@PathVariable String orderId) {
        return ResponseEntity.ok(disputeService.getDisputesByOrder(orderId));
    }

    @GetMapping("/disputes/{disputeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DisputeResponseDTO> getDispute(@PathVariable String disputeId) {
        return ResponseEntity.ok(disputeService.getById(disputeId));
    }

    @PutMapping("/disputes/{disputeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DisputeResponseDTO> updateDispute(@PathVariable String disputeId, @RequestBody UpdateDisputeDTO dto) {
        return ResponseEntity.ok(disputeService.updateDispute(disputeId, dto));
    }

    @GetMapping("/disputes/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<DisputeResponseDTO>> getDisputesByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(disputeService.getDisputesByOrg(orgId));
    }

    // Supplier discussions
    @GetMapping("/{orderId}/discussion")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DiscussionResponseDTO> getDiscussion(@PathVariable String orderId) {
        return ResponseEntity.ok(discussionService.getOrCreateDiscussion(orderId));
    }

    @PostMapping("/{orderId}/discussion/message")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<DiscussionResponseDTO> sendMessage(@PathVariable String orderId, @RequestBody @Valid SendMessageDTO dto) {
        return ResponseEntity.ok(discussionService.sendMessage(orderId, dto));
    }

    // Tracking
    @PostMapping("/{orderId}/tracking")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<TrackingResponseDTO> updateTracking(@PathVariable String orderId, @RequestBody CreateTrackingDTO dto) {
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
    public ResponseEntity<ReceptionResponseDTO> validateReception(@PathVariable String orderId, @RequestBody CreateReceptionDTO dto) {
        dto.setMaterialOrderId(orderId);
        return ResponseEntity.ok(orderService.validateReception(dto));
    }

    @GetMapping("/{orderId}/receptions")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<ReceptionResponseDTO>> getReceptions(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.getReceptions(orderId));
    }

    // Analytics
    @GetMapping("/analytics/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProcurementAnalyticsDTO> getAnalytics(@PathVariable String orgId) {
        List<MaterialOrderResponseDTO> orders = orderService.getByOrg(orgId);
        ProcurementAnalyticsDTO analytics = new ProcurementAnalyticsDTO();
        analytics.setTotalOrders(orders.size());
        analytics.setTotalAmount(orders.stream().mapToInt(o -> o.getTotalAmount() != null ? o.getTotalAmount() : 0).sum());
        analytics.setTotalQuantity(orders.stream().mapToInt(o -> o.getTotalOrderedQuantity() != null ? o.getTotalOrderedQuantity() : 0).sum());
        analytics.setTotalAccepted(orders.stream().mapToInt(o -> o.getTotalAcceptedQuantity() != null ? o.getTotalAcceptedQuantity() : 0).sum());
        analytics.setTotalRejected(orders.stream().mapToInt(o -> o.getTotalRejectedQuantity() != null ? o.getTotalRejectedQuantity() : 0).sum());
        analytics.setTotalReturned(orders.stream().mapToInt(o -> o.getTotalReturnedQuantity() != null ? o.getTotalReturnedQuantity() : 0).sum());
        long pending = orders.stream().filter(o -> "PENDING".equals(o.getStatus())).count();
        long shipped = orders.stream().filter(o -> "SHIPPED".equals(o.getStatus())).count();
        long received = orders.stream().filter(o -> "RECEIVED".equals(o.getStatus()) || "COMPLETED".equals(o.getStatus())).count();
        long disputed = orders.stream().filter(o -> "DISPUTED".equals(o.getStatus())).count();
        analytics.setPendingOrders((int) pending);
        analytics.setInTransitOrders((int) shipped);
        analytics.setCompletedOrders((int) received);
        analytics.setDisputedOrders((int) disputed);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/analytics/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SupplierPerformanceDTO> getSupplierPerformance(@PathVariable String supplierId, @RequestParam String orgId) {
        List<MaterialOrderResponseDTO> orders = orderService.getByOrg(orgId).stream()
                .filter(o -> o.getSupplierId() != null && o.getSupplierId().equals(supplierId))
                .toList();
        SupplierPerformanceDTO perf = new SupplierPerformanceDTO();
        perf.setSupplierId(supplierId);
        perf.setTotalOrders(orders.size());
        long completed = orders.stream().filter(o -> "COMPLETED".equals(o.getStatus())).count();
        long disputed = orders.stream().filter(o -> "DISPUTED".equals(o.getStatus())).count();
        long onTime = orders.stream().filter(o -> o.getReceivedAt() != null && o.getExpectedDeliveryDate() != null
                && !o.getReceivedAt().toLocalDate().isAfter(o.getExpectedDeliveryDate())).count();
        perf.setCompletedOrders((int) completed);
        perf.setDisputedOrders((int) disputed);
        perf.setOnTimeDeliveries((int) onTime);
        double reliability = orders.isEmpty() ? 100.0 : (completed * 100.0) / orders.size();
        double quality = orders.isEmpty() ? 100.0 : ((orders.stream().mapToInt(o -> o.getTotalAcceptedQuantity() != null ? o.getTotalAcceptedQuantity() : 0).sum()) * 100.0)
                / Math.max(1, orders.stream().mapToInt(o -> o.getTotalOrderedQuantity() != null ? o.getTotalOrderedQuantity() : 0).sum());
        perf.setReliabilityScore(reliability);
        perf.setQualityScore(quality);
        return ResponseEntity.ok(perf);
    }
}