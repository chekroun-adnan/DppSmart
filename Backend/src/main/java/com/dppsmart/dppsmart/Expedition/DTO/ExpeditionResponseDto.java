package com.dppsmart.dppsmart.Expedition.DTO;

import com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExpeditionResponseDto {
    private String id;
    private String orderId;
    private String organizationId;
    private ExpeditionStatus status;
    private Integer totalQuantity;
    private Integer packedQuantity;
    private Integer remainingQuantity;
    private Integer requiredBoxes;
    private Integer filledBoxes;
    private Integer partialBoxes;
    private Integer unitsPerBox;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PackageBoxResponseDto> boxes;
}
