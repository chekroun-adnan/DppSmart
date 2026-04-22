package com.dppsmart.dppsmart.Product.Repositories;

import com.dppsmart.dppsmart.Product.Entities.Product;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product,String> {
    List<Product> findByOrganizationId(String organizationId);
}
