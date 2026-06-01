package com.dppsmart.dppsmart.ConflictLock.Repositories;

import com.dppsmart.dppsmart.ConflictLock.Entities.ConflictLock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConflictLockRepository extends MongoRepository<ConflictLock, String> {
    Optional<ConflictLock> findByResourceTypeAndResourceIdAndStatus(
            ConflictLock.ResourceType resourceType, String resourceId, ConflictLock.LockStatus status);
    List<ConflictLock> findByLockedBy(String lockedBy);
    List<ConflictLock> findByStatusAndExpiresAtBefore(ConflictLock.LockStatus status, LocalDateTime now);
    boolean existsByResourceTypeAndResourceIdAndStatus(
            ConflictLock.ResourceType resourceType, String resourceId, ConflictLock.LockStatus status);
}
