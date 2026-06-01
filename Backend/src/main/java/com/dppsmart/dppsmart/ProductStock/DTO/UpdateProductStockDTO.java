package com.dppsmart.dppsmart.ProductStock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProductStockDTO {

    @NotBlank(message = "id is required")
    private String id;

    private String productName;

    private String productId;

    @Min(value = 0, message = "quantity must be >= 0")
    private Integer quantity;

    private String unit;

    private String organizationId;
}
