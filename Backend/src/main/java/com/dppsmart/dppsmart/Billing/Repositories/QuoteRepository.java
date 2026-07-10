package com.dppsmart.dppsmart.Billing.Repositories;

import com.dppsmart.dppsmart.Billing.Entities.Quote;
import com.dppsmart.dppsmart.Billing.Enums.QuoteStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface QuoteRepository extends MongoRepository<Quote, String> {
    List<Quote> findByOrganizationIdOrderByCreatedAtDesc(String organizationId);
    List<Quote> findByClientIdOrderByCreatedAtDesc(String clientId);
    List<Quote> findByOrderId(String orderId);
    List<Quote> findByStatus(QuoteStatus status);
    List<Quote> findByOrganizationIdAndStatusOrderByCreatedAtDesc(String organizationId, QuoteStatus status);
}
