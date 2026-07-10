package com.dppsmart.dppsmart.Billing.Services.Gateway;

public record PaymentResult(
    boolean success,
    String gatewayReference,
    Double amount,
    String message
) {}
