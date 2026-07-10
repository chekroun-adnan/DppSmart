package com.dppsmart.dppsmart.Operations.DTO;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class UpdateOperationRequest {
    private String name;
    private String description;

    @Min(value = 0, message = "estimatedDuration must be positive")
    private Double estimatedDuration;

    private String durationUnit;
    private String responsibleDepartment;
    private String requiredResources;

    @Min(value = 0, message = "executionCost must be non-negative")
    private Double executionCost;

    @Min(value = 0, message = "costPerMinute must be non-negative")
    private Double costPerMinute;

    private String costCurrency;
    private Boolean active;
}
