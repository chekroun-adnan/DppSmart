package com.dppsmart.dppsmart.Billing.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePaymentSessionDto {
    @NotBlank
    private String invoiceId;
    @NotBlank
    private String paymentMethod;
    private String successUrl;
    private String cancelUrl;
}
