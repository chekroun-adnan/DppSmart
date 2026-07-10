package com.dppsmart.dppsmart.Billing.Repositories;

import com.dppsmart.dppsmart.Billing.Entities.ProductPrice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProductPriceRepository extends MongoRepository<ProductPrice, String> {
    List<ProductPrice> findByProductId(String productId);
    List<ProductPrice> findByClientId(String clientId);
    List<ProductPrice> findByOrganizationId(String organizationId);
    Optional<ProductPrice> findFirstByProductIdAndClientIdAndValidFromLessThanEqualAndValidToGreaterThanEqualOrderByCreatedAtDesc(
            String productId, String clientId, LocalDate date1, LocalDate date2);
    Optional<ProductPrice> findFirstByProductIdAndClientIdIsNullAndValidFromLessThanEqualAndValidToGreaterThanEqualOrderByCreatedAtDesc(
            String productId, LocalDate date1, LocalDate date2);
}
