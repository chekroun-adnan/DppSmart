package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TechnicalSheetRepository extends MongoRepository<TechnicalSheet, String> {
    List<TechnicalSheet> findByOrganizationId(String organizationId);
    List<TechnicalSheet> findByOrganizationIdAndType(String organizationId, TechnicalSheetType type);
    List<TechnicalSheet> findByProductId(String productId);
}
