package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateProductionDto {

    @NotBlank(message = "productId is required")
    private String productId;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
    @Min(value = 1, message = "quantity must be >= 1")
    private int quantity;
    @NotNull(message = "steps is required")
    private List<ProductionStep> steps;
}
