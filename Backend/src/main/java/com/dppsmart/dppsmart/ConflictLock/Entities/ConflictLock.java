package com.dppsmart.dppsmart.ConflictLock.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "conflict_locks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConflictLock {
    @Id
    private String id;
    private String resourceType;
    private String resourceId;
    private String lockedBy;
    private String lockedByUserName;
    private String sessionId;
    private LocalDateTime lockedAt;
    private LocalDateTime expiresAt;
    private LockStatus status;

    public enum ResourceType {
        ORDER,
        PRODUCT_STOCK,
        MATERIAL_STOCK,
        ALLOCATION_SESSION
    }

    public enum LockStatus {
        ACTIVE,
        RELEASED,
        EXPIRED
    }
}
