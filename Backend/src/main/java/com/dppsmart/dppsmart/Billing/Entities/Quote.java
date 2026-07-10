package com.dppsmart.dppsmart.Billing.Entities;

import com.dppsmart.dppsmart.Billing.Enums.QuoteStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "quotes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Quote {
    @Id
    private String id;
    private String quoteNumber;
    private String orderId;
    private String clientId;
    private String organizationId;
    private List<QuoteLineItem> items;
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
    private LocalDateTime rejectedAt;
    private String createdBy;
}
