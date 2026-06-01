package com.dppsmart.dppsmart.ProductStock.Repositories;

import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductStockRepository extends MongoRepository<ProductStock, String> {
    List<ProductStock> findByOrganizationId(String orgId);
    List<ProductStock> findByProductId(String productId);
}
