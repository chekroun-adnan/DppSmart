package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialReception;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MaterialReceptionRepository extends MongoRepository<MaterialReception, String> {
    List<MaterialReception> findByMaterialOrderId(String materialOrderId);
}
