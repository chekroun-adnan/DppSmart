package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BomCalculationResultDto {
    private String productId;
    private String technicalSheetId;
    private Integer version;
    private int orderedQuantity;
    private boolean sufficient;
    private List<BomMaterialLineDto> materials;
}
