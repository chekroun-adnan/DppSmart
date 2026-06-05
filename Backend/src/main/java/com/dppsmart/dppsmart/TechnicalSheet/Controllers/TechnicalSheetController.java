package com.dppsmart.dppsmart.TechnicalSheet.Controllers;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.*;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("technicalSheetModuleController")
@RequestMapping("/api/technical-sheets")
@RequiredArgsConstructor
public class TechnicalSheetController {

    private final TechnicalSheetModuleService service;
    private final TechnicalSheetValidationService validationService;

    

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> create(@RequestBody @Valid CreateTechnicalSheetDto dto) {
        return ResponseEntity.ok(service.createSheet(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> update(@PathVariable String id,
                                                            @RequestBody @Valid UpdateTechnicalSheetDto dto) {
        return ResponseEntity.ok(service.updateSheet(id, dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getSheet(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<TechnicalSheetResponseDto>> getAll() {
        return ResponseEntity.ok(service.getAllSheets());
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<TechnicalSheetResponseDto>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(service.getSheetsByOrg(orgId));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<TechnicalSheetResponseDto>> getByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(service.getSheetsByProduct(productId));
    }

    @GetMapping("/product/{productId}/active")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> getActiveByProduct(@PathVariable String productId) {
        return service.getActiveSheetByProduct(productId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.deleteSheet(id);
        return ResponseEntity.noContent().build();
    }

    

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> activate(@PathVariable String id) {
        return ResponseEntity.ok(service.setActive(id));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> archive(@PathVariable String id) {
        return ResponseEntity.ok(service.archiveSheet(id));
    }

    @PostMapping("/{id}/new-version")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetResponseDto> newVersion(@PathVariable String id) {
        return ResponseEntity.ok(service.createNewVersion(id));
    }

    

    @GetMapping("/bom/{productId}/calculate")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<BomCalculationResultDto> calculateBom(
            @PathVariable String productId,
            @RequestParam int quantity,
            @RequestParam(required = false) String organizationId) {
        return ResponseEntity.ok(service.calculateBom(productId, quantity, organizationId));
    }

    

    @PutMapping("/{id}/material-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialSheetItemDto>> saveMaterialItems(
            @PathVariable String id,
            @RequestBody @Valid List<MaterialSheetItemDto> items) {
        return ResponseEntity.ok(service.saveMaterialItems(id, items));
    }

    @GetMapping("/{id}/material-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialSheetItemDto>> getMaterialItems(@PathVariable String id) {
        return ResponseEntity.ok(service.getMaterialItems(id));
    }

    

    @PutMapping("/{id}/operation-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationSheetItemDto>> saveOperationItems(
            @PathVariable String id,
            @RequestBody @Valid List<OperationSheetItemDto> items) {
        return ResponseEntity.ok(service.saveOperationItems(id, items));
    }

    @GetMapping("/{id}/operation-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationSheetItemDto>> getOperationItems(@PathVariable String id) {
        return ResponseEntity.ok(service.getOperationItems(id));
    }

    // ─── VALIDATION ENDPOINTS ───────────────────────────────────────────────────

    @GetMapping("/validate/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetValidationResult> validateProduct(
            @PathVariable String productId) {
        return ResponseEntity.ok(validationService.validateProductTechnicalSheet(productId));
    }

    @GetMapping("/validate/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<TechnicalSheetValidationResult> validateOrder(
            @PathVariable String orderId) {
        return ResponseEntity.ok(validationService.validateOrderTechnicalSheets(orderId));
    }

    @PostMapping("/validate/orders")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<TechnicalSheetValidationResult>> validateOrders(
            @RequestBody List<String> orderIds) {
        return ResponseEntity.ok(validationService.validateOrdersTechnicalSheets(orderIds));
    }
}
