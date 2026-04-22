package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOrderDto {
    @NotBlank(message = "productId is required")
    private String productId;

    @NotBlank(message = "organizationId is required")
    private String organizationId;

    @Min(value = 1, message = "quantity must be >= 1")
    private Integer quantity;

    @NotBlank(message = "status is required")
    private String status;
}

