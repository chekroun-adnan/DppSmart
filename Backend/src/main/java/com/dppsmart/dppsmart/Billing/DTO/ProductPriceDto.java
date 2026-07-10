package com.dppsmart.dppsmart.Billing.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProductPriceDto {
    private String id;
    private String productId;
    private String clientId;
    private Double unitPrice;
    private String currency;
    private LocalDate validFrom;
    private LocalDate validTo;
    private String organizationId;
    private String createdBy;
    private LocalDateTime createdAt;
}
