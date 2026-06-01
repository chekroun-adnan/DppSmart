package com.dppsmart.dppsmart.StockMovement.Repositories;

import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Entities.StockMovement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StockMovementRepository extends MongoRepository<StockMovement, String> {
    List<StockMovement> findByOrganizationIdOrderByCreatedAtDesc(String organizationId);
    List<StockMovement> findByRelatedOrderIdOrderByCreatedAtDesc(String orderId);
    List<StockMovement> findByRelatedProductionIdOrderByCreatedAtDesc(String productionId);
    List<StockMovement> findByProductIdOrderByCreatedAtDesc(String productId);
    List<StockMovement> findByMaterialIdOrderByCreatedAtDesc(String materialId);
    List<StockMovement> findByOrganizationIdAndMovementTypeOrderByCreatedAtDesc(String organizationId, MovementType type);
}
