package com.dppsmart.dppsmart.Pdf.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GeneratePdfRequestDto {
    @NotNull(message = "type is required")
    private PdfReportType type;

    // Optional scope
    private String organizationId;
    private String productId;
}

