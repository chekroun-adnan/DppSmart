package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class MaterialSheetItemDto {
    private String id;
    @NotBlank
    private String materialId;
    @Positive
    private Double quantity;
    private String unit;
    private String notes;
    // populated on response
    private String materialName;
    private String materialReference;
}
