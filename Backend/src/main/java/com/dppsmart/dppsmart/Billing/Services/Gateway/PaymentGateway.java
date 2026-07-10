package com.dppsmart.dppsmart.Billing.Services.Gateway;

import com.dppsmart.dppsmart.Billing.Entities.Invoice;

public interface PaymentGateway {
    String getProviderName();
    PaymentSession createPaymentSession(Invoice invoice, String successUrl, String cancelUrl);
    PaymentResult handleReturn(String sessionId, String gatewayResponse);
    boolean supportsMethod(String method);
}
