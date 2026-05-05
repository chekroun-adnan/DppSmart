package com.dppsmart.dppsmart.Product.Mapper;

import com.dppsmart.dppsmart.Product.DTO.ProductionStepDto;
import com.dppsmart.dppsmart.Product.DTO.RawMaterialDto;
import com.dppsmart.dppsmart.Product.DTO.TechnicalSheetDto;
import com.dppsmart.dppsmart.Product.Entities.RawMaterial;
import com.dppsmart.dppsmart.Product.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;

import java.time.LocalDate;

public class TechnicalSheetMapper {

    public static TechnicalSheet toEntity(TechnicalSheetDto dto) {
        TechnicalSheet sheet = new TechnicalSheet();
        sheet.setVersion(dto.getVersion());
        sheet.setPreparedBy(dto.getPreparedBy());
        sheet.setDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        sheet.setRawMaterials(dto.getRawMaterials().stream().map(TechnicalSheetMapper::toRawMaterial).toList());
        sheet.setProductionSteps(dto.getProductionSteps().stream().map(TechnicalSheetMapper::toProductionStep).toList());
        return sheet;
    }

    private static RawMaterial toRawMaterial(RawMaterialDto dto) {
        RawMaterial rm = new RawMaterial();
        rm.setName(dto.getName());
        rm.setReference(dto.getReference());
        rm.setSupplier(dto.getSupplier());
        rm.setUnit(dto.getUnit());
        rm.setQuantity(dto.getQuantity());
        rm.setNotes(dto.getNotes());
        return rm;
    }

    private static ProductionStep toProductionStep(ProductionStepDto dto) {
        return ProductionStep.builder()
                .orderIndex(dto.getOrderIndex())
                .stepName(dto.getStepName())
                .description(dto.getDescription())
                .machine(dto.getMachine())
                .operator(dto.getOperator())
                .durationMinutes(dto.getDurationMinutes())
                .qualityCheck(dto.getQualityCheck())
                .completed(false)
                .build();
    }
}
