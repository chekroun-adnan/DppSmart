package com.dppsmart.dppsmart.Product.Repositories;

import com.dppsmart.dppsmart.Product.Entities.Product;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductRepository extends MongoRepository<Product,String> {
}
