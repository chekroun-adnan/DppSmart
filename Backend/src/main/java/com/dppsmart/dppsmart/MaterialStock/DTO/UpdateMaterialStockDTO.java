package com.dppsmart.dppsmart.MaterialStock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateMaterialStockDTO {

    @NotBlank(message = "id is required")
    private String id;

    private String name;

    private String referenceCode;

    @Min(value = 0, message = "quantity must be >= 0")
    private Integer quantity;

    @Min(value = 0, message = "minimumThreshold must be >= 0")
    private Integer minimumThreshold;

    private String unit;

    private String organizationId;

    private Double unitPrice;
    private String costCurrency;
    private String supplier;
}
