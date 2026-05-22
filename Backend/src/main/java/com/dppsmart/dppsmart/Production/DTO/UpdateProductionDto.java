package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateProductionDto {

    private String productId;

    @Min(value = 1, message = "quantity must be >= 1")
    private Integer quantity;

    private List<ProductionStep> steps;

    private LocalDate estimatedEndDate;

    private String assignedTo;

    private Integer priority;
}
