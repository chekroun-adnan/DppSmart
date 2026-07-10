package com.dppsmart.dppsmart.Billing.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreatePayPalPaymentDto {
    @NotBlank
    private String orderId;
    @Positive
    private Double amount;
    private String currency;
    private boolean deposit;
}
