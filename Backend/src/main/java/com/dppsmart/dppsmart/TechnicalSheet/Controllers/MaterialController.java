package com.dppsmart.dppsmart.TechnicalSheet.Controllers;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.CreateMaterialDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.MaterialResponseDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.UpdateMaterialDto;
import com.dppsmart.dppsmart.TechnicalSheet.Services.MaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ts-materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialResponseDto> create(@RequestBody @Valid CreateMaterialDto dto) {
        return ResponseEntity.ok(materialService.create(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialResponseDto>> getAll() {
        return ResponseEntity.ok(materialService.getAll());
    }

    @GetMapping("/organization/{orgId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<MaterialResponseDto>> getByOrg(@PathVariable String orgId) {
        return ResponseEntity.ok(materialService.getByOrg(orgId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<MaterialResponseDto> update(@PathVariable String id,
                                                      @RequestBody UpdateMaterialDto dto) {
        return ResponseEntity.ok(materialService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        materialService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
