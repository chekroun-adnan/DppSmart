package com.dppsmart.dppsmart.Billing.DTO;

import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PaymentDto {
    private String id;
    private String invoiceId;
    private Double amount;
    private LocalDate paymentDate;
    private PaymentMethod paymentMethod;
    private String reference;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
}
