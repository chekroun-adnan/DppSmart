package com.dppsmart.dppsmart.Orders.Controllers;

import com.dppsmart.dppsmart.Orders.DTO.CreateOrderDto;
import com.dppsmart.dppsmart.Orders.DTO.OrderResponseDto;
import com.dppsmart.dppsmart.Orders.DTO.UpdateOrderDto;
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

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrderResponseDto> update(@RequestBody @Valid UpdateOrderDto dto) {
        return ResponseEntity.ok(ordersService.update(dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<OrderResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(ordersService.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public ResponseEntity<List<OrderResponseDto>> getAll() {
        return ResponseEntity.ok(ordersService.getAll());
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OrderResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(ordersService.getByOrganization(organizationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        ordersService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

