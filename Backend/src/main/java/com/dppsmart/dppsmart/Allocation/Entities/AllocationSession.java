package com.dppsmart.dppsmart.Allocation.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "allocation_sessions")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AllocationSession {
    @Id
    private String id;
    private String createdBy;
    private String organizationId;
    private List<String> orderIds;
    private AllocationMode allocationMode;
    private AllocationStatus status;
    private Map<String, Map<String, Integer>> allocations;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime expiresAt;

    public enum AllocationMode {
        MANUAL,
        AUTO_OLDEST_ORDER,
        AUTO_CLOSEST_DEADLINE,
        AUTO_CLIENT_PRIORITY,
        AUTO_MAX_FULFILLMENT
    }

    public enum AllocationStatus {
        DRAFT,
        PENDING_SIMULATION,
        SIMULATED,
        CONFIRMED,
        CANCELLED,
        EXPIRED
    }
}
