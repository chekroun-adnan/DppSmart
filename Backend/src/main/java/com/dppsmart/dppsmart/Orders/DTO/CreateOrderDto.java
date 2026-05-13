package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateOrderDto {

    private String organizationId; // optional for CLIENTs — resolved server-side from their account

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<OrderItemDto> items;

    @NotNull(message = "requestedDeliveryDate is required")
    private LocalDate requestedDeliveryDate;
}
