package com.dppsmart.dppsmart.Expedition.DTO;

import com.dppsmart.dppsmart.Expedition.Entities.BoxStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PackageBoxResponseDto {
    private String id;
    private String expeditionId;
    private Integer boxNumber;
    private Integer capacity;
    private Integer currentQuantity;
    private Integer remainingCapacity;
    private BoxStatus status;
    private String barcode;
    private LocalDateTime createdAt;
}
