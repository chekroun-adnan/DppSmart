package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "ts_operations")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Operation {
    @Id
    private String id;
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
    private Boolean active;
    private String organizationId;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
