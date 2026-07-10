package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OperationSheetItemDto {
    private String id;
    @NotBlank
    private String operationId;
    private String operationName;
    private String userId;
    private String userName;
    @Min(1)
    private Integer stepOrder;
    private Double durationEstimate;
    private String notes;
    private String instructions;
    private Boolean qualityCheckRequired;
    private Boolean canRunInParallel;
    private String assignedDepartment;
    private Double costPerMinute;
    private String costCurrency;
    private Double executionCostPerUnit;
}
