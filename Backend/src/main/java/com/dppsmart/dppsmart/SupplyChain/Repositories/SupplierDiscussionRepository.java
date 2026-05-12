package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.SupplierDiscussion;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface SupplierDiscussionRepository extends MongoRepository<SupplierDiscussion, String> {
    Optional<SupplierDiscussion> findByMaterialOrderId(String materialOrderId);
}