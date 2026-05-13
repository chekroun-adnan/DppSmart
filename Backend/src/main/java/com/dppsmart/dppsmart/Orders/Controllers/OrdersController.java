package com.dppsmart.dppsmart.Orders.Controllers;

import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrdersController {

    private final OrdersService ordersService;

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

    @PostMapping("/admin/propose-date")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> adminProposeDate(@RequestBody @Valid AdminProposeDateDto dto) {
        return ResponseEntity.ok(ordersService.adminProposeDate(dto));
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
    public ResponseEntity<OrderResponseDto> cancel(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.cancel(id));
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        ordersService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
