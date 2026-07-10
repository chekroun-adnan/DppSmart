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
        d.setEstimatedDuration(e.getEstimatedDuration());
        d.setDurationUnit(e.getDurationUnit());
        d.setResponsibleDepartment(e.getResponsibleDepartment());
        d.setRequiredResources(e.getRequiredResources());
        d.setExecutionCost(e.getExecutionCost());
        d.setCostPerMinute(e.getCostPerMinute());
        d.setCostCurrency(e.getCostCurrency());
        d.setActive(e.getActive());
        d.setOrganizationId(e.getOrganizationId());
        d.setCreatedBy(e.getCreatedBy());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    public static MaterialSheetItemDto toDto(MaterialSheetItem e, String materialName, String materialReference,
                                              Integer availableStock, Double unitPrice, String costCurrency) {
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
        d.setUnitPrice(unitPrice);
        d.setCostCurrency(costCurrency != null ? costCurrency : "MAD");
        if (unitPrice != null && e.getQuantityPerUnit() != null) {
            double waste = e.getWastePercentage() != null ? e.getWastePercentage() : 0.0;
            double requiredPerUnit = e.getQuantityPerUnit() * (1.0 + waste / 100.0);
            double cost = requiredPerUnit * unitPrice;
            d.setMaterialCostPerUnit(Math.round(cost * 100.0) / 100.0);
        }
        return d;
    }

    public static OperationSheetItemDto toDto(OperationSheetItem e, String operationName, String userName,
                                                Double costPerMinute, String costCurrency, Double defaultDurationMinutes) {
        OperationSheetItemDto d = new OperationSheetItemDto();
        d.setId(e.getId());
        d.setOperationId(e.getOperationId());
        d.setOperationName(operationName != null ? operationName : e.getOperationName());
        d.setUserId(e.getUserId());
        d.setUserName(userName);
        d.setStepOrder(e.getStepOrder());
        d.setDurationEstimate(e.getDurationEstimate());
        d.setNotes(e.getNotes());
        d.setInstructions(e.getInstructions());
        d.setQualityCheckRequired(e.getQualityCheckRequired());
        d.setCanRunInParallel(e.getCanRunInParallel());
        d.setAssignedDepartment(e.getAssignedDepartment());
        d.setCostPerMinute(costPerMinute);
        d.setCostCurrency(costCurrency != null ? costCurrency : "MAD");
        Double durationMinutes = e.getDurationEstimate();
        if (durationMinutes == null) {
            durationMinutes = defaultDurationMinutes;
        }
        if (durationMinutes != null && costPerMinute != null) {
            double cost = durationMinutes * costPerMinute;
            d.setExecutionCostPerUnit(Math.round(cost * 100.0) / 100.0);
        }
        return d;
    }

    public static OperationSheetItemDto toDto(OperationSheetItem e, String operationName, String userName,
                                                Double costPerMinute, String costCurrency) {
        return toDto(e, operationName, userName, costPerMinute, costCurrency, null);
    }

    @Deprecated
    public static MaterialSheetItemDto toDto(MaterialSheetItem e, String materialName, String materialReference, Integer availableStock) {
        return toDto(e, materialName, materialReference, availableStock, null, "MAD");
    }

    @Deprecated
    public static OperationSheetItemDto toDto(OperationSheetItem e, String operationName, String userName) {
        return toDto(e, operationName, userName, null, "MAD");
    }
}
