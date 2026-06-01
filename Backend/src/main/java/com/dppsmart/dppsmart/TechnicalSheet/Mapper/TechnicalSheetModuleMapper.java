package com.dppsmart.dppsmart.TechnicalSheet.Mapper;

import com.dppsmart.dppsmart.TechnicalSheet.DTO.*;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.*;

public class TechnicalSheetModuleMapper {

    public static TechnicalSheetResponseDto toDto(TechnicalSheet e) {
        TechnicalSheetResponseDto d = new TechnicalSheetResponseDto();
        d.setId(e.getId());
        d.setName(e.getName());
        d.setType(e.getType());
        d.setStatus(e.getStatus());
        d.setVersion(e.getVersion());
        d.setDescription(e.getDescription());
        d.setNotes(e.getNotes());
        d.setOrganizationId(e.getOrganizationId());
        d.setProductId(e.getProductId());
        d.setTargetQuantity(e.getTargetQuantity());
        d.setCreatedBy(e.getCreatedBy());
        d.setUpdatedBy(e.getUpdatedBy());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    public static OperationResponseDto toDto(Operation e) {
        OperationResponseDto d = new OperationResponseDto();
        d.setId(e.getId());
        d.setName(e.getName());
        d.setDescription(e.getDescription());
        d.setDefaultDuration(e.getDefaultDuration());
        d.setOrganizationId(e.getOrganizationId());
        d.setCreatedBy(e.getCreatedBy());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    public static MaterialSheetItemDto toDto(MaterialSheetItem e, String materialName, String materialReference, Integer availableStock) {
        MaterialSheetItemDto d = new MaterialSheetItemDto();
        d.setId(e.getId());
        d.setMaterialId(e.getMaterialId());
        d.setQuantityPerUnit(e.getQuantityPerUnit());
        d.setUnit(e.getUnit());
        d.setWastePercentage(e.getWastePercentage());
        d.setNotes(e.getNotes());
        d.setMaterialName(materialName);
        d.setMaterialReference(materialReference);
        d.setAvailableStock(availableStock);
        return d;
    }

    public static OperationSheetItemDto toDto(OperationSheetItem e, String operationName, String userName) {
        OperationSheetItemDto d = new OperationSheetItemDto();
        d.setId(e.getId());
        d.setOperationId(e.getOperationId());
        d.setUserId(e.getUserId());
        d.setStepOrder(e.getStepOrder());
        d.setDurationEstimate(e.getDurationEstimate());
        d.setNotes(e.getNotes());
        d.setOperationName(operationName);
        d.setUserName(userName);
        return d;
    }
}
