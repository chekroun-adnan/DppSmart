package com.dppsmart.dppsmart.ProductionCapacity.Services;

import com.dppsmart.dppsmart.ProductionCapacity.DTO.CapacityCheckResponseDTO;
import com.dppsmart.dppsmart.ProductionCapacity.Entities.ProductionCapacity;
import com.dppsmart.dppsmart.ProductionCapacity.Entities.ProductionQueue;
import com.dppsmart.dppsmart.ProductionCapacity.Repositories.ProductionCapacityRepository;
import com.dppsmart.dppsmart.ProductionCapacity.Repositories.ProductionQueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CapacityService {

    private final ProductionCapacityRepository capacityRepository;
    private final ProductionQueueRepository queueRepository;

    public CapacityCheckResponseDTO checkCapacity(int requiredUnits, String organizationId) {
        List<ProductionCapacity> workstations = capacityRepository
                .findByOrganizationIdAndIsActiveTrue(organizationId);

        List<CapacityCheckResponseDTO.WorkstationDTO> workstationDTOs = new ArrayList<>();
        int totalDailyCapacity = 0;
        int totalCurrentLoad = 0;
        List<String> overloaded = new ArrayList<>();

        for (ProductionCapacity wc : workstations) {
            int load = queueRepository.countByWorkstationIdAndStatus(wc.getId(), ProductionQueue.QueueStatus.QUEUED);
            int utilization = wc.getDailyCapacity() > 0 ? (load * 100 / wc.getDailyCapacity()) : 0;
            boolean available = utilization < 90;

            totalDailyCapacity += wc.getDailyCapacity();
            totalCurrentLoad += load;

            workstationDTOs.add(CapacityCheckResponseDTO.WorkstationDTO.builder()
                    .id(wc.getId())
                    .name(wc.getWorkstationName())
                    .type(wc.getWorkstationType())
                    .dailyCapacity(wc.getDailyCapacity())
                    .currentLoad(load)
                    .utilizationPercent(utilization)
                    .available(available)
                    .build());

            if (!available) overloaded.add(wc.getWorkstationName());
        }

        int availableWorkstations = (int) workstationDTOs.stream().filter(w -> w.isAvailable()).count();
        int totalAvailableCapacity = workstationDTOs.stream()
                .filter(w -> w.isAvailable())
                .mapToInt(w -> w.getDailyCapacity() - w.getCurrentLoad())
                .sum();

        int estimatedDays = totalAvailableCapacity > 0
                ? (int) Math.ceil((double) requiredUnits / totalAvailableCapacity)
                : Integer.MAX_VALUE;

        boolean sufficient = availableWorkstations > 0 && totalAvailableCapacity >= requiredUnits && overloaded.isEmpty();

        List<String> warnings = new ArrayList<>();
        if (!sufficient) {
            if (overloaded.isEmpty() && availableWorkstations == 0) {
                warnings.add("No workstations available");
            } else if (totalAvailableCapacity < requiredUnits) {
                warnings.add("Insufficient capacity: need " + requiredUnits + " units, available " + totalAvailableCapacity);
            }
            if (!overloaded.isEmpty()) {
                warnings.add("Overloaded workstations: " + String.join(", ", overloaded));
            }
        }

        return CapacityCheckResponseDTO.builder()
                .sufficient(sufficient)
                .availableWorkstations(availableWorkstations)
                .currentLoad(totalCurrentLoad)
                .totalCapacity(totalDailyCapacity)
                .estimatedDurationDays(estimatedDays)
                .estimatedStartDate(LocalDate.now().plusDays(1))
                .estimatedCompletionDate(LocalDate.now().plusDays(estimatedDays + 1))
                .workstations(workstationDTOs)
                .warnings(warnings)
                .overloadedWorkstations(overloaded)
                .recommendedAction(sufficient ? "PROCEED" : "DELAY_OR_REDISTRIBUTE")
                .build();
    }

    public void addToQueue(String productionId, String orderId, String productId,
                           String workstationId, int quantity, int priority, String orgId) {
        ProductionQueue entry = new ProductionQueue();
        entry.setId(java.util.UUID.randomUUID().toString().replace("-", ""));
        entry.setOrganizationId(orgId);
        entry.setProductionId(productionId);
        entry.setOrderId(orderId);
        entry.setProductId(productId);
        entry.setWorkstationId(workstationId);
        entry.setQuantity(quantity);
        entry.setPriority(priority);
        entry.setStatus(ProductionQueue.QueueStatus.QUEUED);
        entry.setScheduledDate(LocalDate.now().plusDays(1));
        entry.setCreatedAt(java.time.LocalDateTime.now());
        queueRepository.save(entry);

        ProductionCapacity wc = capacityRepository.findById(workstationId).orElse(null);
        if (wc != null) {
            wc.setCurrentLoad(wc.getCurrentLoad() + quantity);
            capacityRepository.save(wc);
        }
    }
}
