package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateMaterialDto {
    @NotBlank
    private String name;
    private String referenceCode;
    @NotBlank
    private String unit;
    @NotBlank
    private String organizationId;
}
