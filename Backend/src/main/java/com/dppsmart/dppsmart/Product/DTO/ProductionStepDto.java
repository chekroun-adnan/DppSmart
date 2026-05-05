package com.dppsmart.dppsmart.Product.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProductionStepDto {
    @Min(0)
    private int orderIndex;
    @NotBlank
    private String stepName;
    private String description;
    private String machine;
    private String operator;
    private Double durationMinutes;
    private String qualityCheck;
}
