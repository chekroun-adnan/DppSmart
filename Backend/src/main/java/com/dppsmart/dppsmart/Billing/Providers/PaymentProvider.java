package com.dppsmart.dppsmart.Billing.Providers;

import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Enums.PaymentType;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.User.Entities.User;

public interface PaymentProvider {
    PaymentMethod getPaymentMethod();
    boolean requiresAdminValidation();
    Payment initiatePayment(Orders order, User client, PaymentType paymentType, Double amount, String currency);
    Payment approvePayment(Payment payment, User admin);
    Payment rejectPayment(Payment payment, User admin, String reason);
}
