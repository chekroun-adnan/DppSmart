package com.dppsmart.dppsmart.Allocation.Controllers;

import com.dppsmart.dppsmart.Allocation.DTO.AllocationRequestDTO;
import com.dppsmart.dppsmart.Allocation.DTO.AllocationReviewResponseDTO;
import com.dppsmart.dppsmart.Allocation.DTO.ProductionPlanningDTO;
import com.dppsmart.dppsmart.Allocation.DTO.SimulationImpactDTO;
import java.time.LocalDate;
import com.dppsmart.dppsmart.Allocation.Services.AllocationService;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.ConflictLock.Entities.ConflictLock;
import com.dppsmart.dppsmart.ConflictLock.Services.ConflictService;
import com.dppsmart.dppsmart.DeliveryLog.Entities.DeliveryLog;
import com.dppsmart.dppsmart.DeliveryLog.Services.DeliveryService;
import com.dppsmart.dppsmart.ProductionCapacity.DTO.CapacityCheckResponseDTO;
import com.dppsmart.dppsmart.ProductionCapacity.Services.CapacityService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;
    private final DeliveryService deliveryService;
    private final CapacityService capacityService;
    private final ConflictService conflictService;
    private final UserRepository userRepository;

    @PostMapping("/allocation-review")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<AllocationReviewResponseDTO> getAllocationReview(@RequestBody List<String> orderIds) {
        User user = getCurrentUser();
        return ResponseEntity.ok(allocationService.getReviewData(orderIds, user));
    }

    @PostMapping("/recalculate-allocation")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<AllocationReviewResponseDTO> recalculateAllocation(@RequestBody AllocationRequestDTO dto) {
        User user = getCurrentUser();
        return ResponseEntity.ok(allocationService.recalculateAllocation(dto, user));
    }

    @PostMapping("/preview-impact")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SimulationImpactDTO> previewImpact(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String sessionId = body.get("sessionId");
        return ResponseEntity.ok(allocationService.previewImpact(sessionId, user));
    }

    @PostMapping("/{orderId}/reserve-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> reserveStockForOrder(@PathVariable String orderId) {
        User user = getCurrentUser();
        allocationService.previewImpact(orderId, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{orderId}/release-reservations")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> releaseReservations(@PathVariable String orderId) {
        User user = getCurrentUser();
        allocationService.cancelAllocation(orderId, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{orderId}/send-to-delivery")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<DeliveryLog> sendToDelivery(
            @PathVariable String orderId,
            @RequestBody(required = false) List<DeliveryLog.DeliveryItem> partialItems) {
        User user = getCurrentUser();
        return ResponseEntity.ok(deliveryService.sendToDelivery(orderId, partialItems, user));
    }

    @PostMapping("/production-allocation")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<AllocationReviewResponseDTO.PerOrderProductionStatusDTO>> getProductionAllocation(
            @RequestBody List<String> orderIds) {
        User user = getCurrentUser();
        return ResponseEntity.ok(allocationService.getProductionAllocation(orderIds, user));
    }

    @PostMapping("/{orderId}/items/{productId}/start-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<AllocationReviewResponseDTO.PerOrderProductionStatusDTO> startProductionForItem(
            @PathVariable String orderId,
            @PathVariable String productId,
            @RequestBody Map<String, Integer> body) {
        User user = getCurrentUser();
        int qty = body.getOrDefault("quantityToProduce", 0);
        return ResponseEntity.ok(allocationService.startProductionForItem(orderId, productId, qty, user));
    }

    @PostMapping("/{orderId}/start-production")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> startProduction(@PathVariable String orderId) {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{orderId}/cancel-allocation")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> cancelAllocation(@PathVariable String orderId) {
        User user = getCurrentUser();
        allocationService.cancelAllocation(orderId, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/production/capacity-check")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<CapacityCheckResponseDTO> capacityCheck(
            @RequestParam int requiredUnits,
            @RequestParam String organizationId) {
        return ResponseEntity.ok(capacityService.checkCapacity(requiredUnits, organizationId));
    }

    @PostMapping("/allocation/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> confirmAllocation(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String sessionId = body.get("sessionId");
        allocationService.confirmAllocation(sessionId, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{orderId}/delivery-logs")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<List<DeliveryLog>> getDeliveryLogs(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveryLogs(orderId));
    }

    @PostMapping("/{orderId}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> acquireLock(@PathVariable String orderId) {
        User user = getCurrentUser();
        boolean acquired = conflictService.tryAcquireLock(
                ConflictLock.ResourceType.ORDER, orderId,
                user.getId(), user.getName() != null ? user.getName() : user.getEmail(),
                "session_" + orderId);
        return ResponseEntity.ok(Map.of("acquired", acquired, "resourceType", "ORDER", "resourceId", orderId));
    }

    @PostMapping("/{orderId}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> releaseLock(@PathVariable String orderId) {
        User user = getCurrentUser();
        conflictService.releaseLock(ConflictLock.ResourceType.ORDER, orderId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{orderId}/lock-status")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> getLockStatus(@PathVariable String orderId) {
        boolean locked = conflictService.isLocked(ConflictLock.ResourceType.ORDER, orderId);
        var lockInfo = conflictService.getLockInfo(ConflictLock.ResourceType.ORDER, orderId);
        return ResponseEntity.ok(Map.of(
                "locked", locked,
                "lockedBy", lockInfo.map(ConflictLock::getLockedByUserName).orElse(null),
                "lockedAt", lockInfo.map(l -> l.getLockedAt().toString()).orElse(null)
        ));
    }

    @PostMapping("/calculate-requirements")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductionPlanningDTO> calculateRequirements() {
        User user = getCurrentUser();
        return ResponseEntity.ok(allocationService.calculateRequirements(user));
    }

    @PostMapping("/{orderId}/confirm-delivery-date")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> confirmDeliveryDate(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String dateStr = body.get("confirmedDeliveryDate");
        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : null;
        allocationService.confirmDeliveryDate(orderId, date, user);
        return ResponseEntity.ok().build();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new com.dppsmart.dppsmart.Common.Exceptions.NotFoundException("User not found"));
    }
}
