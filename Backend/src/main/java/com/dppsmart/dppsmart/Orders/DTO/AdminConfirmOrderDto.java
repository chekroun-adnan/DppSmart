package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AdminConfirmOrderDto {

    @NotBlank(message = "orderId is required")
    private String orderId;

    private LocalDate confirmedDeliveryDate;
}
