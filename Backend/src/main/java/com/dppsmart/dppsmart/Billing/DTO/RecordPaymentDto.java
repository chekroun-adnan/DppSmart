package com.dppsmart.dppsmart.Billing.DTO;

import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RecordPaymentDto {
    @NotNull @Min(1)
    private Double amount;
    private LocalDate paymentDate;
    @NotNull
    private PaymentMethod paymentMethod;
    private String reference;
    private String notes;
}
