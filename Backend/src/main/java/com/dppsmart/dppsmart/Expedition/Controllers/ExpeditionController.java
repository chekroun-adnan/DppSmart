package com.dppsmart.dppsmart.Expedition.Controllers;

import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Expedition.DTO.*;
import com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus;
import com.dppsmart.dppsmart.Expedition.Services.ExpeditionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expeditions")
@RequiredArgsConstructor
public class ExpeditionController {

    private final ExpeditionService expeditionService;
    private final UserRepository userRepository;

    @PostMapping("/create/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> createExpedition(
            @PathVariable String orderId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.createExpedition(orderId, user));
    }

    @PostMapping("/{expeditionId}/pack-box")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ExpeditionResponseDto> packBox(
            @PathVariable String expeditionId,
            @RequestBody PackBoxRequestDto dto,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.packBox(expeditionId, dto.getBoxId(), dto.getQuantity(), user));
    }

    @PostMapping("/{expeditionId}/pack")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ExpeditionResponseDto> packIntoNextBox(
            @PathVariable String expeditionId,
            @RequestBody Map<String, Integer> body,
            Authentication auth) {
        User user = findUser(auth);
        int quantity = body.getOrDefault("quantity", 0);
        return ResponseEntity.ok(expeditionService.packIntoNextBox(expeditionId, quantity, user));
    }

    @PostMapping("/boxes/{boxId}/seal")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ExpeditionResponseDto> sealBox(
            @PathVariable String boxId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.sealBox(boxId, user));
    }

    @PostMapping("/{expeditionId}/ready-to-ship")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> markReadyToShip(
            @PathVariable String expeditionId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.markReadyToShip(expeditionId, user));
    }

    @PutMapping("/{expeditionId}/units-per-box")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> updateUnitsPerBox(
            @PathVariable String expeditionId,
            @RequestBody Map<String, Integer> body,
            Authentication auth) {
        User user = findUser(auth);
        int unitsPerBox = body.getOrDefault("unitsPerBox", 0);
        return ResponseEntity.ok(expeditionService.updateUnitsPerBox(expeditionId, unitsPerBox, user));
    }

    @PostMapping("/{expeditionId}/ship")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> markShipped(
            @PathVariable String expeditionId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.markShipped(expeditionId, user));
    }

    @PostMapping("/{expeditionId}/deliver")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> markDelivered(
            @PathVariable String expeditionId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.markDelivered(expeditionId, user));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ExpeditionResponseDto> getByOrderId(
            @PathVariable String orderId,
            Authentication auth) {
        User user = findUser(auth);
        return ResponseEntity.ok(expeditionService.getOrCreateForOrder(orderId, user));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Map<String, Object>> syncExistingOrders(Authentication auth) {
        User user = findUser(auth);
        String orgId = user.getRole() == Roles.ADMIN ? null : user.getOrganizationId();
        int created = expeditionService.syncExistingOrders(orgId, user);
        return ResponseEntity.ok(Map.of("expeditionsCreated", created));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<ExpeditionResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(expeditionService.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ExpeditionResponseDto>> getAll(Authentication auth) {
        User user = findUser(auth);
        String orgId = user.getRole() == Roles.ADMIN ? null : user.getOrganizationId();
        return ResponseEntity.ok(expeditionService.getByOrganization(orgId));
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ExpeditionResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(expeditionService.getByOrganization(organizationId));
    }

    @GetMapping("/organization/{organizationId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ExpeditionResponseDto>> getByOrganizationAndStatus(
            @PathVariable String organizationId,
            @PathVariable ExpeditionStatus status) {
        return ResponseEntity.ok(expeditionService.getByOrganizationAndStatus(organizationId, status));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ExpeditionResponseDto>> getByStatus(
            @PathVariable ExpeditionStatus status,
            Authentication auth) {
        User user = findUser(auth);
        String orgId = user.getRole() == Roles.ADMIN ? null : user.getOrganizationId();
        return ResponseEntity.ok(expeditionService.getByOrganizationAndStatus(orgId, status));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionDashboardDto> getDashboard(Authentication auth) {
        User user = findUser(auth);
        String orgId = user.getRole() == Roles.ADMIN ? null : user.getOrganizationId();
        return ResponseEntity.ok(expeditionService.getDashboard(orgId));
    }

    @GetMapping("/dashboard/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionDashboardDto> getDashboardByOrg(@PathVariable String organizationId) {
        return ResponseEntity.ok(expeditionService.getDashboard(organizationId));
    }

    @PostMapping("/auto-create/{stepId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ExpeditionResponseDto> autoCreateFromStep(
            @PathVariable String stepId,
            Authentication auth) {
        User user = findUser(auth);
        ExpeditionResponseDto dto = expeditionService.autoCreateWhenPackagingStepActive(stepId, user);
        if (dto == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(dto);
    }

    private User findUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
