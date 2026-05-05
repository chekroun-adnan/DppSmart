package com.dppsmart.dppsmart.TechnicalSheet.Controllers;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.*;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.deleteSheet(id);
        return ResponseEntity.noContent().build();
    }


    @PutMapping("/{id}/material-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialSheetItemDto>> saveMaterialItems(@PathVariable String id,
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
    public ResponseEntity<List<OperationSheetItemDto>> saveOperationItems(@PathVariable String id,
                                                                           @RequestBody @Valid List<OperationSheetItemDto> items) {
        return ResponseEntity.ok(service.saveOperationItems(id, items));
    }

    @GetMapping("/{id}/operation-items")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OperationSheetItemDto>> getOperationItems(@PathVariable String id) {
        return ResponseEntity.ok(service.getOperationItems(id));
    }
}
