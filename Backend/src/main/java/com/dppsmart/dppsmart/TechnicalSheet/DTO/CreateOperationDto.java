package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOperationDto {
    private String id;
    @NotBlank
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
    @NotBlank
    private String organizationId;
}
