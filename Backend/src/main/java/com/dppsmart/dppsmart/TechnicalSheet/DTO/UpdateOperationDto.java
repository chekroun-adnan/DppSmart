package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.Data;

@Data
public class UpdateOperationDto {
    private String name;
    private String description;
    private Double defaultDuration;
    private Double estimatedDuration;
    private String durationUnit;
    private String responsibleDepartment;
    private String requiredResources;
    private Double executionCost;
    private Double costPerMinute;
    private String costCurrency;
}
