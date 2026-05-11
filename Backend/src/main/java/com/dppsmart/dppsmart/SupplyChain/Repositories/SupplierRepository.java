package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.Supplier;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SupplierRepository extends MongoRepository<Supplier, String> {
    List<Supplier> findByOrganizationId(String orgId);
}
