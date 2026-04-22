package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateOrderDto {
    @NotBlank(message = "id is required")
    private String id;

    private String productId;
    private String organizationId;

    @Min(value = 1, message = "quantity must be >= 1")
    private Integer quantity;

    private String status;
}

