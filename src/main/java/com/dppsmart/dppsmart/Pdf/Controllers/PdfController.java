package com.dppsmart.dppsmart.Pdf.Controllers;

import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Pdf.DTO.GeneratePdfRequestDto;
import com.dppsmart.dppsmart.Pdf.Services.PdfReportService;
import com.dppsmart.dppsmart.Security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfController {
    private final PdfReportService pdfReportService;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> generate(@RequestBody @Valid GeneratePdfRequestDto req) {
        String userId = currentUserId();
        byte[] bytes = pdfReportService.generate(userId, req);

        String filename = "dppsmart-report-" + LocalDateTime.now().toString().replace(':', '-') + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(bytes);
    }

    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth != null ? auth.getPrincipal() : null;
        if (principal instanceof UserPrincipal up) return up.getId();
        throw new ForbiddenException("Unauthenticated");
    }
}

