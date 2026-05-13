package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AdminConfirmOrderDto {

    @NotBlank(message = "orderId is required")
    private String orderId;

    @NotNull(message = "confirmedDeliveryDate is required")
    private LocalDate confirmedDeliveryDate;
}
