package com.dppsmart.dppsmart.Billing.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuoteLineItem {
    private String productId;
    private String productName;
    private Integer quantity;
    private Double unitPrice;
    private Double totalPrice;
}
