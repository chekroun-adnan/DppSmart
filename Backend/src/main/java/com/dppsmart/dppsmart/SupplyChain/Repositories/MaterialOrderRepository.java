package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MaterialOrderRepository extends MongoRepository<MaterialOrder, String> {
    List<MaterialOrder> findByOrganizationId(String orgId);
    List<MaterialOrder> findBySupplierId(String supplierId);
    List<MaterialOrder> findByOrganizationIdAndStatus(String orgId, MaterialOrderStatus status);
    List<MaterialOrder> findByOrganizationIdAndStatusIn(String orgId, List<MaterialOrderStatus> statuses);
    List<MaterialOrder> findBySourceClientOrderId(String sourceClientOrderId);
}
