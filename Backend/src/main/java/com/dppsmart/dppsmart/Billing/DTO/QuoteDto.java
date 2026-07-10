package com.dppsmart.dppsmart.Billing.DTO;

import com.dppsmart.dppsmart.Billing.Enums.QuoteStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class QuoteDto {
    private String id;
    private String quoteNumber;
    private String orderId;
    private String clientId;
    private String organizationId;
    private List<QuoteLineItemDto> items;
    private Double subtotal;
    private Double taxRate;
    private Double taxAmount;
    private Double discountPercent;
    private Double discountAmount;
    private Double total;
    private String currency;
    private QuoteStatus status;
    private LocalDate validUntil;
    private String notes;
    private String termsAndConditions;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private LocalDateTime acceptedAt;
    private String createdBy;
}
