package com.dppsmart.dppsmart.Expedition.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "package_boxes")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PackageBox {
    @Id
    private String id;
    private String expeditionId;
    private Integer boxNumber;
    private Integer capacity;
    private Integer currentQuantity;
    private Integer remainingCapacity;
    private BoxStatus status;
    private String barcode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
