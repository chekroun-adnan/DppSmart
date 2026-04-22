package com.dppsmart.dppsmart.Stock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatedStockDTO {

    private String materialName;
    @Min(value = 0, message = "quantity must be >= 0")
    private Integer quantity;
    @Min(value = 0, message = "minimumThreshold must be >= 0")
    private Integer minimumThreshold;
    private String unit;
    private String organizationId;
    @NotBlank(message = "id is required")
    private String id;
}
