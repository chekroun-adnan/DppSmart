package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTechnicalSheetDto {
    @NotBlank
    private String name;
    @NotNull
    private TechnicalSheetType type;
    private String description;
    @NotBlank
    private String organizationId;
    private String productId;
}
