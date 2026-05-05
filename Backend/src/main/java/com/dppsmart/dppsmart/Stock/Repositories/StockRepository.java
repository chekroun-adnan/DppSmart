package com.dppsmart.dppsmart.Stock.Repositories;

import com.dppsmart.dppsmart.Stock.Entities.Stock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StockRepository extends MongoRepository<Stock,String> {
    List<Stock> findByOrganizationId(String orgId);
}
