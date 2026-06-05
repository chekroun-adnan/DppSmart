package com.dppsmart.dppsmart.Operations.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OperationDTO {
    private String id;
    private String name;
    private String description;
    private Double defaultDuration;
    private Double estimatedDuration;
    private String durationUnit;
    private String responsibleDepartment;
    private String requiredResources;
    private Double executionCost;
    private String costCurrency;
    private Boolean active;
    private String organizationId;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
