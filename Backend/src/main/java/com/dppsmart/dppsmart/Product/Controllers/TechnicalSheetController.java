package com.dppsmart.dppsmart.Product.Controllers;

import com.dppsmart.dppsmart.Product.DTO.TechnicalSheetDto;
import com.dppsmart.dppsmart.Product.Services.TechnicalSheetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController("productTechnicalSheetController")
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class TechnicalSheetController {

    private final TechnicalSheetService technicalSheetService;

    /**
     * Save (or replace) the technical sheet for a product.
     * Body: TechnicalSheetDto with rawMaterials and productionSteps.
     */
    @PostMapping("/{id}/technical-sheet")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> save(@PathVariable String id,
                                     @RequestBody @Valid TechnicalSheetDto dto) {
        technicalSheetService.saveTechnicalSheet(id, dto);
        return ResponseEntity.ok().build();
    }

    /**
     * Generate and stream the technical sheet PDF inline so it opens in the browser.
     */
    @GetMapping("/{id}/technical-sheet/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<byte[]> pdf(@PathVariable String id) {
        byte[] pdfBytes = technicalSheetService.generatePdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"technical-sheet.pdf\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(pdfBytes.length))
                .body(pdfBytes);
    }
}
