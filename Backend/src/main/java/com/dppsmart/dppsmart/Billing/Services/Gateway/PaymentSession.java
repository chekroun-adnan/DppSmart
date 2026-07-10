package com.dppsmart.dppsmart.Billing.Services.Gateway;

public record PaymentSession(
    String sessionId,
    String redirectUrl,
    String formHtml,
    String gatewayReference
) {}
