package com.dppsmart.dppsmart.Product.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TechnicalSheetDto {
    private String version;
    private String preparedBy;
    private LocalDate date;

    @Valid
    @NotEmpty
    private List<RawMaterialDto> rawMaterials;

    @Valid
    @NotEmpty
    private List<ProductionStepDto> productionSteps;
}
