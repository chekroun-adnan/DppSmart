package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateOrderDto {

    @NotBlank(message = "id is required")
    private String id;

    private String status;
}
