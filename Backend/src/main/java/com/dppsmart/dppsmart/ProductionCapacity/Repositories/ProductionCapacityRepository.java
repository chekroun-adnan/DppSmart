package com.dppsmart.dppsmart.ProductionCapacity.Repositories;

import com.dppsmart.dppsmart.ProductionCapacity.Entities.ProductionCapacity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductionCapacityRepository extends MongoRepository<ProductionCapacity, String> {
    List<ProductionCapacity> findByOrganizationId(String organizationId);
    List<ProductionCapacity> findByOrganizationIdAndIsActiveTrue(String organizationId);
}
