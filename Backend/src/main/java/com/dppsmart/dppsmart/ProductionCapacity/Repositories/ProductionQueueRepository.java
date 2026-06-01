package com.dppsmart.dppsmart.ProductionCapacity.Repositories;

import com.dppsmart.dppsmart.ProductionCapacity.Entities.ProductionQueue;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface ProductionQueueRepository extends MongoRepository<ProductionQueue, String> {
    List<ProductionQueue> findByOrganizationId(String organizationId);
    List<ProductionQueue> findByOrganizationIdAndStatus(String organizationId, ProductionQueue.QueueStatus status);
    List<ProductionQueue> findByWorkstationIdAndScheduledDate(String workstationId, LocalDate date);
    List<ProductionQueue> findByOrderId(String orderId);
    int countByWorkstationIdAndStatus(String workstationId, ProductionQueue.QueueStatus status);
}
