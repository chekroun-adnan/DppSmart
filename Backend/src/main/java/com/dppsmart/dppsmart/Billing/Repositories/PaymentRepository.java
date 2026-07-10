package com.dppsmart.dppsmart.Billing.Repositories;

import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Enums.PaymentRecordStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);
    Optional<Payment> findByPaypalOrderId(String paypalOrderId);
    Optional<Payment> findByPaypalCaptureId(String paypalCaptureId);
    List<Payment> findByOrderId(String orderId);
    List<Payment> findByClientId(String clientId);
    List<Payment> findByStatus(PaymentRecordStatus status);
    List<Payment> findByOrganizationIdAndStatus(String organizationId, PaymentRecordStatus status);
    long countByOrganizationIdAndStatus(String organizationId, PaymentRecordStatus status);
    long countByStatus(PaymentRecordStatus status);
    List<Payment> findByOrganizationIdOrderByCreatedAtDesc(String organizationId);
}
