package com.dppsmart.dppsmart.ConflictLock.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.ConflictLock.Entities.ConflictLock;
import com.dppsmart.dppsmart.ConflictLock.Repositories.ConflictLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConflictService {

    private final ConflictLockRepository conflictLockRepository;

    private static final int LOCK_TTL_MINUTES = 30;

    public boolean tryAcquireLock(ConflictLock.ResourceType resourceType, String resourceId,
                                   String userId, String userName, String sessionId) {
        Optional<ConflictLock> existing = conflictLockRepository
                .findByResourceTypeAndResourceIdAndStatus(resourceType, resourceId, ConflictLock.LockStatus.ACTIVE);

        if (existing.isPresent()) {
            ConflictLock lock = existing.get();
            if (lock.getLockedBy().equals(userId)) {
                lock.setExpiresAt(LocalDateTime.now().plusMinutes(LOCK_TTL_MINUTES));
                conflictLockRepository.save(lock);
                return true;
            }
            if (lock.getExpiresAt().isBefore(LocalDateTime.now())) {
                lock.setStatus(ConflictLock.LockStatus.EXPIRED);
                conflictLockRepository.save(lock);
            } else {
                return false;
            }
        }

        ConflictLock lock = new ConflictLock();
        lock.setId(NanoIdUtils.randomNanoId());
        lock.setResourceType(resourceType.name());
        lock.setResourceId(resourceId);
        lock.setLockedBy(userId);
        lock.setLockedByUserName(userName);
        lock.setSessionId(sessionId);
        lock.setLockedAt(LocalDateTime.now());
        lock.setExpiresAt(LocalDateTime.now().plusMinutes(LOCK_TTL_MINUTES));
        lock.setStatus(ConflictLock.LockStatus.ACTIVE);
        conflictLockRepository.save(lock);
        return true;
    }

    public void releaseLock(ConflictLock.ResourceType resourceType, String resourceId, String userId) {
        Optional<ConflictLock> lock = conflictLockRepository
                .findByResourceTypeAndResourceIdAndStatus(resourceType, resourceId, ConflictLock.LockStatus.ACTIVE);
        lock.ifPresent(l -> {
            l.setStatus(ConflictLock.LockStatus.RELEASED);
            conflictLockRepository.save(l);
        });
    }

    public boolean isLocked(ConflictLock.ResourceType resourceType, String resourceId) {
        return conflictLockRepository
                .existsByResourceTypeAndResourceIdAndStatus(resourceType, resourceId, ConflictLock.LockStatus.ACTIVE);
    }

    public Optional<ConflictLock> getLockInfo(ConflictLock.ResourceType resourceType, String resourceId) {
        return conflictLockRepository
                .findByResourceTypeAndResourceIdAndStatus(resourceType, resourceId, ConflictLock.LockStatus.ACTIVE);
    }

    @Scheduled(fixedRate = 60000)
    public void expireStaleLocks() {
        java.util.List<ConflictLock> expired = conflictLockRepository
                .findByStatusAndExpiresAtBefore(ConflictLock.LockStatus.ACTIVE, LocalDateTime.now());
        for (ConflictLock lock : expired) {
            lock.setStatus(ConflictLock.LockStatus.EXPIRED);
            conflictLockRepository.save(lock);
            log.warn("Expired stale lock on {} {} held by {}", lock.getResourceType(), lock.getResourceId(), lock.getLockedBy());
        }
    }
}
