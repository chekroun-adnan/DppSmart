package com.dppsmart.dppsmart.ProductionCapacity.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CapacityCheckResponseDTO {
    private boolean sufficient;
    private int availableWorkstations;
    private int currentLoad;
    private int totalCapacity;
    private int estimatedDurationDays;
    private LocalDate estimatedStartDate;
    private LocalDate estimatedCompletionDate;
    private List<WorkstationDTO> workstations;
    private List<String> warnings;
    private List<String> overloadedWorkstations;
    private String recommendedAction;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WorkstationDTO {
        private String id;
        private String name;
        private String type;
        private int dailyCapacity;
        private int currentLoad;
        private int utilizationPercent;
        private boolean available;
    }
}
