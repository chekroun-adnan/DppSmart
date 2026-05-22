package com.dppsmart.dppsmart.Allocation.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AllocationRequestDTO {
    private List<String> orderIds;
    private AllocationMode mode;
    private Map<String, Map<String, Integer>> manualAllocations;
    private boolean simulateOnly;

    public enum AllocationMode {
        MANUAL,
        AUTO_OLDEST_ORDER,
        AUTO_CLOSEST_DEADLINE,
        AUTO_CLIENT_PRIORITY,
        AUTO_MAX_FULFILLMENT
    }
}
