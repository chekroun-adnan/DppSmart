package com.dppsmart.dppsmart.Production.Repositories;

import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductionStepEntityRepository extends MongoRepository<ProductionStepEntity, String> {
    List<ProductionStepEntity> findByOrderIdOrderBySequenceOrderAsc(String orderId);
    List<ProductionStepEntity> findByProductionOrderIdOrderBySequenceOrderAsc(String productionOrderId);
    boolean existsByOrderId(String orderId);
    long countByOrderId(String orderId);
    long countByOrderIdAndStatus(String orderId, ProductionStepStatus status);
}
