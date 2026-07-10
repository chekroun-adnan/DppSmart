package com.dppsmart.dppsmart.Billing.Providers;

import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Enums.PaymentRecordStatus;
import com.dppsmart.dppsmart.Billing.Enums.PaymentType;
import com.dppsmart.dppsmart.Billing.Repositories.PaymentRepository;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderPaymentStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ManualBankTransferProvider implements PaymentProvider {

    private final PaymentRepository paymentRepository;
    private final OrdersRepository ordersRepository;

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.BANK_TRANSFER;
    }

    @Override
    public boolean requiresAdminValidation() {
        return true;
    }

    @Override
    public Payment initiatePayment(Orders order, User client, PaymentType paymentType, Double amount, String currency) {
        if (paymentType == PaymentType.DEPOSIT && order.getDepositPaymentId() != null) {
            throw new IllegalStateException("Deposit payment already initiated for this order");
        }
        if (paymentType == PaymentType.FINAL && order.getFinalPaymentId() != null) {
            throw new IllegalStateException("Final payment already initiated for this order");
        }

        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setClientId(client.getId());
        payment.setOrganizationId(order.getOrganizationId());
        payment.setAmount(amount);
        payment.setCurrency(currency != null ? currency : "MAD");
        payment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        payment.setPaymentType(paymentType);
        payment.setStatus(PaymentRecordStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);

        if (paymentType == PaymentType.DEPOSIT) {
            order.setDepositPaymentId(saved.getId());
            order.setPaymentStatus(OrderPaymentStatus.UNPAID);
            order.setStatus(ClientOrderStatus.AWAITING_DEPOSIT);
        } else {
            order.setFinalPaymentId(saved.getId());
            order.setStatus(ClientOrderStatus.FINAL_PAYMENT_PENDING);
        }
        order.setAmountDue(amount);
        order.setUpdatedAt(LocalDateTime.now());
        ordersRepository.save(order);

        log.info("Bank transfer {} payment initiated: order={}, amount={}", paymentType, order.getId(), amount);
        return saved;
    }

    @Override
    public Payment approvePayment(Payment payment, User admin) {
        payment.setStatus(PaymentRecordStatus.APPROVED);
        payment.setValidatedAt(LocalDateTime.now());
        payment.setValidatedBy(admin.getId());
        paymentRepository.save(payment);

        Orders order = ordersRepository.findById(payment.getOrderId()).orElse(null);
        if (order == null) return payment;

        double previousPaid = order.getAmountPaid() != null ? order.getAmountPaid() : 0;
        double newPaid = previousPaid + payment.getAmount();
        order.setAmountPaid(newPaid);
        order.setAmountDue(Math.max(0, (order.getTotalPrice() != null ? order.getTotalPrice() : 0) - newPaid));

        if (payment.getPaymentType() == PaymentType.DEPOSIT) {
            order.setPaymentStatus(OrderPaymentStatus.PARTIALLY_PAID);
            order.setStatus(ClientOrderStatus.CONFIRMED);
            order.setRemainingBalance(order.getTotalPrice() != null ? order.getTotalPrice() - newPaid : 0);
        } else {
            order.setPaymentStatus(OrderPaymentStatus.PAID);
            order.setStatus(ClientOrderStatus.DELIVERED);
            order.setRemainingBalance(0.0);
        }

        order.setUpdatedAt(LocalDateTime.now());
        ordersRepository.save(order);

        log.info("Bank transfer {} approved: payment={}, by={}", payment.getPaymentType(), payment.getId(), admin.getEmail());
        return payment;
    }

    @Override
    public Payment rejectPayment(Payment payment, User admin, String reason) {
        payment.setStatus(PaymentRecordStatus.REJECTED);
        payment.setValidatedAt(LocalDateTime.now());
        payment.setValidatedBy(admin.getId());
        payment.setNotes(reason);
        paymentRepository.save(payment);

        Orders order = ordersRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            if (payment.getPaymentType() == PaymentType.DEPOSIT) {
                order.setStatus(ClientOrderStatus.AWAITING_DEPOSIT);
            } else {
                order.setStatus(ClientOrderStatus.FINAL_PAYMENT_PENDING);
            }
            order.setUpdatedAt(LocalDateTime.now());
            ordersRepository.save(order);
        }

        log.info("Bank transfer {} rejected: payment={}, by={}, reason={}",
                payment.getPaymentType(), payment.getId(), admin.getEmail(), reason);
        return payment;
    }
}
