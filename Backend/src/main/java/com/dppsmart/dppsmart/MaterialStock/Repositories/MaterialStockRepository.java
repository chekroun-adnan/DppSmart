package com.dppsmart.dppsmart.MaterialStock.Repositories;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MaterialStockRepository extends MongoRepository<MaterialStock, String> {
    List<MaterialStock> findByOrganizationId(String orgId);

    Optional<MaterialStock> findByReferenceCodeAndOrganizationId(String referenceCode, String organizationId);
    List<MaterialStock> findByNameIgnoreCaseAndUnitIgnoreCaseAndOrganizationId(String name, String unit, String organizationId);
    Optional<MaterialStock> findFirstByNameIgnoreCaseAndOrganizationId(String name, String organizationId);
}
