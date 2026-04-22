package com.dppsmart.dppsmart.Production.Repositories;


import com.dppsmart.dppsmart.Production.Entities.Production;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductionRepository extends MongoRepository<Production, String> {

    List<Production> findByOrganizationId(String organizationId);

    List<Production> findByProductId(String productId);
}
