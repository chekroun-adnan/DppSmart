package com.dppsmart.dppsmart.StockMovement.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.StockMovement.DTO.StockMovementDto;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Entities.StockMovement;
import com.dppsmart.dppsmart.StockMovement.Repositories.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockMovementService {

    private final StockMovementRepository repository;

    

    public void recordMaterialMovement(MovementType type, String materialId, String itemName,
                                       String unit, double qty, double before, double after,
                                       String orderId, String productionId, String orgId, String createdBy) {
        StockMovement m = StockMovement.builder()
                .id(NanoIdUtils.randomNanoId())
                .movementType(type)
                .materialId(materialId)
                .itemName(itemName)
                .unit(unit)
                .quantity(qty)
                .beforeQuantity(before)
                .afterQuantity(after)
                .relatedOrderId(orderId)
                .relatedProductionId(productionId)
                .organizationId(orgId)
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(m);
    }

    public void recordProductMovement(MovementType type, String productId, String itemName,
                                      String unit, double qty, double before, double after,
                                      String orderId, String productionId, String orgId, String createdBy) {
        StockMovement m = StockMovement.builder()
                .id(NanoIdUtils.randomNanoId())
                .movementType(type)
                .productId(productId)
                .itemName(itemName)
                .unit(unit)
                .quantity(qty)
                .beforeQuantity(before)
                .afterQuantity(after)
                .relatedOrderId(orderId)
                .relatedProductionId(productionId)
                .organizationId(orgId)
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(m);
    }

    

    public List<StockMovementDto> getByOrganization(String orgId) {
        return repository.findByOrganizationIdOrderByCreatedAtDesc(orgId)
                .stream().map(this::toDto).toList();
    }

    public List<StockMovementDto> getByOrder(String orderId) {
        return repository.findByRelatedOrderIdOrderByCreatedAtDesc(orderId)
                .stream().map(this::toDto).toList();
    }

    public List<StockMovementDto> getByProduction(String productionId) {
        return repository.findByRelatedProductionIdOrderByCreatedAtDesc(productionId)
                .stream().map(this::toDto).toList();
    }

    public List<StockMovementDto> getByProduct(String productId) {
        return repository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream().map(this::toDto).toList();
    }

    public List<StockMovementDto> getByMaterial(String materialId) {
        return repository.findByMaterialIdOrderByCreatedAtDesc(materialId)
                .stream().map(this::toDto).toList();
    }

    private StockMovementDto toDto(StockMovement e) {
        StockMovementDto d = new StockMovementDto();
        d.setId(e.getId());
        d.setMovementType(e.getMovementType());
        d.setProductId(e.getProductId());
        d.setMaterialId(e.getMaterialId());
        d.setItemName(e.getItemName());
        d.setUnit(e.getUnit());
        d.setQuantity(e.getQuantity());
        d.setBeforeQuantity(e.getBeforeQuantity());
        d.setAfterQuantity(e.getAfterQuantity());
        d.setRelatedOrderId(e.getRelatedOrderId());
        d.setRelatedProductionId(e.getRelatedProductionId());
        d.setOrganizationId(e.getOrganizationId());
        d.setCreatedBy(e.getCreatedBy());
        d.setCreatedAt(e.getCreatedAt());
        return d;
    }
}
