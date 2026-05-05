package com.dppsmart.dppsmart.Scan.Controllers;

import com.dppsmart.dppsmart.Scan.DTO.CreateScanEventDto;
import com.dppsmart.dppsmart.Scan.DTO.ScanEventResponseDto;
import com.dppsmart.dppsmart.Scan.Services.ScanService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scans")
@RequiredArgsConstructor
public class ScanController {
    private final ScanService scanService;

    @PostMapping
    public ResponseEntity<ScanEventResponseDto> create(@RequestBody @Valid CreateScanEventDto dto,
                                                       HttpServletRequest request) {
        return ResponseEntity.ok(scanService.recordScan(dto, request));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ScanEventResponseDto>> getByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(scanService.getByProduct(productId));
    }

    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<ScanEventResponseDto>> getByOrganization(@PathVariable String organizationId) {
        return ResponseEntity.ok(scanService.getByOrganization(organizationId));
    }
}

