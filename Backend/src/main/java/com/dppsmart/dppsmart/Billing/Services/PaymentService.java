package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Enums.PaymentRecordStatus;
import com.dppsmart.dppsmart.Billing.Enums.PaymentType;
import com.dppsmart.dppsmart.Billing.Providers.PaymentProvider;
import com.dppsmart.dppsmart.Billing.Repositories.PaymentRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderPaymentStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrdersRepository ordersRepository;
    private final InvoiceService invoiceService;
    private final List<PaymentProvider> providers;

    private final Map<PaymentMethod, PaymentProvider> providerMap = new HashMap<>();

    @PostConstruct
    public void init() {
        for (PaymentProvider p : providers) {
            providerMap.put(p.getPaymentMethod(), p);
        }
        log.info("Registered {} payment providers: {}", providerMap.size(), providerMap.keySet());
    }

    public PaymentProvider getProvider(PaymentMethod method) {
        PaymentProvider provider = providerMap.get(method);
        if (provider == null) {
            throw new BadRequestException("No payment provider registered for: " + method);
        }
        return provider;
    }


    public Payment initiatePayment(String orderId, User client, PaymentMethod method,
                                    PaymentType paymentType, Double amount, String currency) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        if (!order.getClientId().equals(client.getId())) {
            throw new BadRequestException("Order does not belong to this client");
        }

        validatePaymentTypeAllowed(order, paymentType);

        PaymentProvider provider = getProvider(method);
        return provider.initiatePayment(order, client, paymentType, amount, currency);
    }

    private void validatePaymentTypeAllowed(Orders order, PaymentType paymentType) {
        if (paymentType == PaymentType.DEPOSIT) {
            if (order.getStatus() != ClientOrderStatus.AWAITING_DEPOSIT
                    && order.getStatus() != ClientOrderStatus.DEPOSIT_UNDER_REVIEW) {
                throw new BadRequestException(
                        "Deposit payment can only be initiated when status is AWAITING_DEPOSIT. Current: " + order.getStatus());
            }
            if (order.getDepositPaymentId() != null) {
                Payment existing = paymentRepository.findById(order.getDepositPaymentId()).orElse(null);
                if (existing != null && existing.getStatus() == PaymentRecordStatus.PENDING) {
                    throw new BadRequestException("Deposit payment already pending. Upload proof or retry.");
                }
            }
        } else if (paymentType == PaymentType.FINAL) {
            if (order.getStatus() != ClientOrderStatus.FINAL_PAYMENT_PENDING
                    && order.getStatus() != ClientOrderStatus.READY_FOR_DELIVERY) {
                throw new BadRequestException(
                        "Final payment can only be initiated when order is ready for delivery. Current: " + order.getStatus());
            }
            if (order.getFinalPaymentId() != null) {
                Payment existing = paymentRepository.findById(order.getFinalPaymentId()).orElse(null);
                if (existing != null && existing.getStatus() == PaymentRecordStatus.PENDING) {
                    throw new BadRequestException("Final payment already pending. Upload proof or retry.");
                }
            }
        }
    }


    public Payment submitPaymentProof(String paymentId, String referenceNumber, String paymentProofUrl, User client) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + paymentId));

        if (!payment.getClientId().equals(client.getId())) {
            throw new BadRequestException("This payment does not belong to you");
        }

        if (payment.getStatus() != PaymentRecordStatus.PENDING) {
            throw new BadRequestException("Payment is not in PENDING status");
        }

        payment.setReferenceNumber(referenceNumber);
        payment.setPaymentProofUrl(paymentProofUrl);
        payment.setStatus(PaymentRecordStatus.UNDER_REVIEW);
        paymentRepository.save(payment);

        Orders order = ordersRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            if (payment.getPaymentType() == PaymentType.DEPOSIT) {
                order.setStatus(ClientOrderStatus.DEPOSIT_UNDER_REVIEW);
            }
            order.setUpdatedAt(LocalDateTime.now());
            ordersRepository.save(order);
        }

        log.info("Payment proof submitted: payment={}, type={}, ref={}", paymentId, payment.getPaymentType(), referenceNumber);
        return payment;
    }


    public Payment approvePayment(String paymentId, User admin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + paymentId));

        PaymentProvider provider = getProvider(payment.getPaymentMethod());
        if (!provider.requiresAdminValidation()) {
            throw new BadRequestException("Payment method does not require manual approval");
        }

        if (payment.getStatus() != PaymentRecordStatus.UNDER_REVIEW) {
            throw new BadRequestException("Payment is not under review");
        }

        Payment approved = provider.approvePayment(payment, admin);

        if (payment.getPaymentType() == PaymentType.FINAL) {
            try {
                invoiceService.createInvoiceFromOrder(payment.getOrderId(), admin);
                log.info("Invoice auto-generated for order {} after final payment approval", payment.getOrderId());
            } catch (Exception e) {
                log.warn("Failed to auto-generate invoice for order {}: {}", payment.getOrderId(), e.getMessage());
            }
        }

        return approved;
    }


    public Payment rejectPayment(String paymentId, User admin, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + paymentId));

        PaymentProvider provider = getProvider(payment.getPaymentMethod());
        if (!provider.requiresAdminValidation()) {
            throw new BadRequestException("Payment method does not require manual approval");
        }

        if (payment.getStatus() != PaymentRecordStatus.UNDER_REVIEW) {
            throw new BadRequestException("Payment cannot be rejected in status: " + payment.getStatus());
        }

        return provider.rejectPayment(payment, admin, reason);
    }


    public boolean isDepositApproved(String orderId) {
        Orders order = ordersRepository.findById(orderId).orElse(null);
        if (order == null) return false;
        return order.getPaymentStatus() == OrderPaymentStatus.PARTIALLY_PAID
                || order.getPaymentStatus() == OrderPaymentStatus.PAID;
    }

    public boolean isFullyPaid(String orderId) {
        Orders order = ordersRepository.findById(orderId).orElse(null);
        if (order == null) return false;
        return order.getPaymentStatus() == OrderPaymentStatus.PAID;
    }

    public void validateDepositForProduction(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (order.getPaymentStatus() != OrderPaymentStatus.PARTIALLY_PAID
                && order.getPaymentStatus() != OrderPaymentStatus.PAID) {
            throw new BadRequestException(
                    "Deposit must be approved before production can start. Payment status: " + order.getPaymentStatus());
        }
    }

    public void validateFinalPaymentForDelivery(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (order.getRemainingBalance() != null && order.getRemainingBalance() > 0) {
            throw new BadRequestException(
                    "Remaining balance must be paid before delivery. Outstanding: " + order.getRemainingBalance());
        }
    }


    public List<Payment> getPaymentsByOrder(String orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    public List<Payment> getClientPayments(String clientId) {
        return paymentRepository.findByClientId(clientId);
    }

    public Payment getPayment(String paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + paymentId));
    }

    public List<Payment> getPaymentsByOrganization(String organizationId) {
        return paymentRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    public List<Payment> getPaymentsByOrganizationAndStatus(String organizationId, PaymentRecordStatus status) {
        return paymentRepository.findByOrganizationIdAndStatus(organizationId, status);
    }


    public double getTotalRevenue() {
        List<Payment> approved = paymentRepository.findByStatus(PaymentRecordStatus.APPROVED);
        return approved.stream().mapToDouble(Payment::getAmount).sum();
    }

    public long countByStatus(PaymentRecordStatus status) {
        return paymentRepository.countByStatus(status);
    }

    public long countByOrganizationAndStatus(String organizationId, PaymentRecordStatus status) {
        return paymentRepository.countByOrganizationIdAndStatus(organizationId, status);
    }

    public long countPaidOrders() {
        return ordersRepository.countByPaymentStatus(OrderPaymentStatus.PAID);
    }

    public long countUnpaidOrders() {
        return ordersRepository.countByPaymentStatus(OrderPaymentStatus.UNPAID);
    }

    public double getOutstandingAmount() {
        List<Orders> unpaid = ordersRepository.findByPaymentStatus(OrderPaymentStatus.UNPAID);
        return unpaid.stream()
                .mapToDouble(o -> o.getTotalPrice() != null ? o.getTotalPrice() : 0)
                .sum();
    }

    public Map<String, Object> getPaymentStats(String organizationId) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRevenue", getTotalRevenue());
        stats.put("paidOrders", countPaidOrders());
        stats.put("unpaidOrders", countUnpaidOrders());
        stats.put("outstandingAmount", getOutstandingAmount());
        stats.put("pendingPayments", countByOrganizationAndStatus(organizationId, PaymentRecordStatus.PENDING));
        stats.put("underReviewPayments", countByOrganizationAndStatus(organizationId, PaymentRecordStatus.UNDER_REVIEW));
        stats.put("approvedPayments", countByOrganizationAndStatus(organizationId, PaymentRecordStatus.APPROVED));
        stats.put("rejectedPayments", countByOrganizationAndStatus(organizationId, PaymentRecordStatus.REJECTED));
        return stats;
    }


    public Payment createPaypalPayment(String orderId, String clientId, Double amount, String currency, String paypalOrderId) {
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setClientId(clientId);
        payment.setAmount(amount);
        payment.setCurrency(currency);
        payment.setPaymentMethod(PaymentMethod.PAYPAL);
        payment.setProvider("PAYPAL");
        payment.setPaypalOrderId(paypalOrderId);
        payment.setStatus(PaymentRecordStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }
}
