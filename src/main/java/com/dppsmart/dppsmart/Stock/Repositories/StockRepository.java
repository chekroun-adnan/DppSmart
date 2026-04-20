package com.dppsmart.dppsmart.Stock.Repositories;

import com.dppsmart.dppsmart.Stock.Entities.Stock;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockRepository extends MongoRepository<Stock,String> {
}
