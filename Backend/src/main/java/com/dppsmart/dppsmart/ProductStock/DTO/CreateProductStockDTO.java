package com.dppsmart.dppsmart.ProductStock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateProductStockDTO {

    @NotBlank(message = "productName is required")
    private String productName;

    private String productId;

    @NotNull(message = "quantity is required")
    @Min(value = 0, message = "quantity must be >= 0")
    private Integer quantity;

    @NotBlank(message = "unit is required")
    private String unit;

    @NotBlank(message = "organizationId is required")
    private String organizationId;
}
