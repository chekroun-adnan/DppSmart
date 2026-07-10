package com.dppsmart.dppsmart.Production.Repositories;

import com.dppsmart.dppsmart.Production.Entities.ProductionProgressLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductionProgressLogRepository extends MongoRepository<ProductionProgressLog, String> {
    List<ProductionProgressLog> findByStepIdOrderByTimestampAsc(String stepId);
    List<ProductionProgressLog> findByOrderIdOrderByTimestampAsc(String orderId);
    List<ProductionProgressLog> findByStepIdAndTimestampBetweenOrderByTimestampDesc(String stepId, LocalDateTime start, LocalDateTime end);
}
