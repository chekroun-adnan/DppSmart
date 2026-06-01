package com.dppsmart.dppsmart.DeliveryLog.Repositories;

import com.dppsmart.dppsmart.DeliveryLog.Entities.DeliveryLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DeliveryLogRepository extends MongoRepository<DeliveryLog, String> {
    List<DeliveryLog> findByOrderId(String orderId);
    List<DeliveryLog> findByOrganizationId(String organizationId);
    List<DeliveryLog> findByOrderIdAndStatus(String orderId, DeliveryLog.DeliveryStatus status);
}
