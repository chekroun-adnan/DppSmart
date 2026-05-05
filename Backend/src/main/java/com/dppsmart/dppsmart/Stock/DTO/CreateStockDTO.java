package com.dppsmart.dppsmart.Stock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class CreateStockDTO {

    @NotBlank(message = "materialName is required")
    private String materialName;
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
