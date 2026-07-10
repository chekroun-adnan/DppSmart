package com.dppsmart.dppsmart.Expedition.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "expeditions")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Expedition {
    @Id
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
}
