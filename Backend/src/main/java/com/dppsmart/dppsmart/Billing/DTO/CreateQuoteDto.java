package com.dppsmart.dppsmart.Billing.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateQuoteDto {
    private String orderId;
    private String clientId;
    private List<QuoteLineItemDto> items;
    private Double taxRate;
    private Double discountPercent;
    private LocalDate validUntil;
    private String notes;
    private String termsAndConditions;
}
