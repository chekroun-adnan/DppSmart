package com.dppsmart.dppsmart.Allocation.Repositories;

import com.dppsmart.dppsmart.Allocation.Entities.AllocationSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AllocationSessionRepository extends MongoRepository<AllocationSession, String> {
    List<AllocationSession> findByOrganizationId(String organizationId);
    List<AllocationSession> findByCreatedBy(String createdBy);
    List<AllocationSession> findByStatusAndExpiresAtBefore(AllocationSession.AllocationStatus status, LocalDateTime now);
    List<AllocationSession> findByOrderIdsContaining(String orderId);
}
