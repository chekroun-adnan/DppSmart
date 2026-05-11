package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialTracking;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MaterialTrackingRepository extends MongoRepository<MaterialTracking, String> {
    List<MaterialTracking> findByMaterialOrderId(String materialOrderId);
}
