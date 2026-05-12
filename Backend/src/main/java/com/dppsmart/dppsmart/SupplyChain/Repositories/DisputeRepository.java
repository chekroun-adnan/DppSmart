package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.Dispute;
import com.dppsmart.dppsmart.SupplyChain.Enums.DisputeStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DisputeRepository extends MongoRepository<Dispute, String> {
    List<Dispute> findByPurchaseOrderId(String purchaseOrderId);
    List<Dispute> findByPurchaseOrderItemId(String purchaseOrderItemId);
    List<Dispute> findByOrganizationId(String organizationId);
    List<Dispute> findByStatus(DisputeStatus status);
}