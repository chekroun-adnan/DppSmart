package com.dppsmart.dppsmart.MaterialStock.Repositories;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MaterialStockRepository extends MongoRepository<MaterialStock, String> {
    List<MaterialStock> findByOrganizationId(String orgId);
}
