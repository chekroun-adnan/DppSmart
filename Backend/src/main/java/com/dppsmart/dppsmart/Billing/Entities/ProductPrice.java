package com.dppsmart.dppsmart.Billing.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "product_prices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductPrice {
    @Id
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
    private LocalDateTime updatedAt;
}
