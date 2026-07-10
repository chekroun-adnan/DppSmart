package com.dppsmart.dppsmart.Billing.DTO;

import lombok.Data;

@Data
public class QuoteLineItemDto {
    private String productId;
    private String productName;
    private Integer quantity;
    private Double unitPrice;
    private Double totalPrice;
}
