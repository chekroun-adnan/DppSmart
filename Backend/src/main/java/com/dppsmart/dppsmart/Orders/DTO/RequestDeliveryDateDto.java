package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RequestDeliveryDateDto {
    @NotNull
    private LocalDate proposedDate;
    private String message;
}
