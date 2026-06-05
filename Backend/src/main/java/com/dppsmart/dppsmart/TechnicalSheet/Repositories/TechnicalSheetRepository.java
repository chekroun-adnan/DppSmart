package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TechnicalSheetRepository extends MongoRepository<TechnicalSheet, String> {
    List<TechnicalSheet> findByOrganizationId(String organizationId);
    List<TechnicalSheet> findByOrganizationIdAndType(String organizationId, TechnicalSheetType type);
    List<TechnicalSheet> findByProductId(String productId);
    List<TechnicalSheet> findByProductIdOrderByVersionDesc(String productId);
    Optional<TechnicalSheet> findFirstByProductIdAndStatusOrderByVersionDesc(String productId, TechnicalSheetStatus status);
    Optional<TechnicalSheet> findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(String productId, TechnicalSheetType type, TechnicalSheetStatus status);
    List<TechnicalSheet> findByProductIdAndStatusNot(String productId, TechnicalSheetStatus status);
}
