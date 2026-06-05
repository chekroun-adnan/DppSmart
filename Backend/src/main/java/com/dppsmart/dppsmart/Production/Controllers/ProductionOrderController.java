package com.dppsmart.dppsmart.Production.Controllers;

import com.dppsmart.dppsmart.Production.DTO.*;
import com.dppsmart.dppsmart.Production.Services.ProductionOrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/production/orders")
public class ProductionOrderController {

    @Autowired
    private ProductionOrderService productionOrderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<OrderProductionDto> getProductionOrders() {
        return productionOrderService.getProductionOrders();
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public OrderProductionDto getOrderProduction(@PathVariable String orderId) {
        return productionOrderService.getOrderProduction(orderId);
    }

    @GetMapping("/{orderId}/steps")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductionStepDto> getSteps(@PathVariable String orderId) {
        return productionOrderService.getSteps(orderId);
    }

    @PostMapping("/{orderId}/generate-steps")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public GenerateStepsResponse generateSteps(@PathVariable String orderId) {
        return productionOrderService.generateSteps(orderId);
    }

    @PostMapping("/steps/{stepId}/start")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto startStep(@PathVariable String stepId) {
        return productionOrderService.startStep(stepId);
    }

    @PostMapping("/steps/{stepId}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto completeStep(@PathVariable String stepId) {
        return productionOrderService.completeStep(stepId);
    }

    @PostMapping("/steps/{stepId}/block")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto blockStep(
            @PathVariable String stepId,
            @RequestBody @Valid BlockStepRequest request) {
        return productionOrderService.blockStep(stepId, request.getReason());
    }

    @PostMapping("/steps/{stepId}/skip")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionStepDto skipStep(@PathVariable String stepId) {
        return productionOrderService.skipStep(stepId);
    }
}
