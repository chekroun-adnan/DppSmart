package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.Delivery;
import com.dppsmart.dppsmart.SupplyChain.Enums.DeliveryStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DeliveryRepository extends MongoRepository<Delivery, String> {
    List<Delivery> findByMaterialOrderId(String materialOrderId);
    List<Delivery> findByOrganizationId(String organizationId);
    List<Delivery> findByStatus(DeliveryStatus status);
    List<Delivery> findByMaterialOrderIdAndStatus(String materialOrderId, DeliveryStatus status);
}