package com.dppsmart.dppsmart.Billing.Repositories;

import com.dppsmart.dppsmart.Billing.Entities.Invoice;
import com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    List<Invoice> findByOrganizationIdOrderByCreatedAtDesc(String organizationId);
    List<Invoice> findByClientIdOrderByCreatedAtDesc(String clientId);
    List<Invoice> findByOrderId(String orderId);
    List<Invoice> findByStatus(InvoiceStatus status);
    List<Invoice> findByOrganizationIdAndStatusOrderByCreatedAtDesc(String organizationId, InvoiceStatus status);
    List<Invoice> findByDueDateBeforeAndStatusNot(LocalDate date, InvoiceStatus status);
}
