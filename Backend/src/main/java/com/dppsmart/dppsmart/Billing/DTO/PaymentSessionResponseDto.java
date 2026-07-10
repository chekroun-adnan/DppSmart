package com.dppsmart.dppsmart.Billing.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentSessionResponseDto {
    private String sessionId;
    private String redirectUrl;
    private String formHtml;
    private String gatewayReference;
    private String paymentMethod;
}
