package com.dppsmart.dppsmart.Billing.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PayPalOrderResponseDto {
    private String paypalOrderId;
    private String approvalUrl;
    private String paymentId;
}
