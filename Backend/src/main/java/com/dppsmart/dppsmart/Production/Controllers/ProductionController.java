package com.dppsmart.dppsmart.Production.Controllers;

import com.dppsmart.dppsmart.Production.DTO.CreateProductionDto;
import com.dppsmart.dppsmart.Production.DTO.ProductionMaterialConsumptionDto;
import com.dppsmart.dppsmart.Production.DTO.ProductionResponseDto;
import com.dppsmart.dppsmart.Production.DTO.UpdateProductionDto;
import com.dppsmart.dppsmart.Production.DTO.UpdateProductionStatusDto;
import com.dppsmart.dppsmart.Production.Services.ProductionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productions")
public class ProductionController {

    @Autowired
    private ProductionService productionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionResponseDto create(@RequestBody @Valid CreateProductionDto dto) {
        return productionService.create(dto);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductionResponseDto> getAll() {
        return productionService.getAll();
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductionResponseDto> getByOrganization(@PathVariable String organizationId) {
        return productionService.getByOrganization(organizationId);
    }

    @GetMapping("/by-order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductionResponseDto> getByOrderId(@PathVariable String orderId) {
        return productionService.getByOrderId(orderId);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionResponseDto updateStatus(
            @PathVariable String id,
            @RequestBody @Valid UpdateProductionStatusDto dto) {
        return productionService.updateStatus(id, dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionResponseDto update(
            @PathVariable String id,
            @RequestBody @Valid UpdateProductionDto dto) {
        return productionService.update(id, dto);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductionResponseDto> complete(@PathVariable String id) {
        return ResponseEntity.ok(productionService.completeProductionBatch(id));
    }

    @GetMapping("/{id}/material-consumption")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<ProductionMaterialConsumptionDto> getMaterialConsumption(@PathVariable String id) {
        return ResponseEntity.ok(productionService.getMaterialConsumption(id));
    }

    @PutMapping("/{id}/step/start/{stepIndex}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ProductionResponseDto startStep(
            @PathVariable String id,
            @PathVariable int stepIndex) {
        return productionService.startStep(id, stepIndex);
    }

    @PutMapping("/{id}/step/complete/{stepIndex}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ProductionResponseDto completeStep(
            @PathVariable String id,
            @PathVariable int stepIndex) {
        return productionService.completeStep(id, stepIndex);
    }

    @GetMapping("/my-assignments")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public List<ProductionResponseDto> getMyAssignments() {
        return productionService.getMyAssignments();
    }

    @PutMapping("/{id}/step/{stepIndex}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductionResponseDto assignStep(
            @PathVariable String id,
            @PathVariable int stepIndex,
            @RequestParam String employeeId,
            @RequestParam(required = false) String employeeName) {
        return productionService.assignStep(id, stepIndex, employeeId, employeeName);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public void delete(@PathVariable String id) {
        productionService.delete(id);
    }
}
