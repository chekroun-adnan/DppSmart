package com.dppsmart.dppsmart.MaterialStock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMaterialStockDTO {

    @NotBlank(message = "name is required")
    private String name;

    private String referenceCode;

    @NotNull(message = "quantity is required")
    @Min(value = 0, message = "quantity must be >= 0")
    private Integer quantity;

    @NotNull(message = "minimumThreshold is required")
    @Min(value = 0, message = "minimumThreshold must be >= 0")
    private Integer minimumThreshold;

    @NotBlank(message = "unit is required")
    private String unit;

    @NotBlank(message = "organizationId is required")
    private String organizationId;
}
