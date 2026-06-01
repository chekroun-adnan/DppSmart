package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TechnicalSheetResponseDto {
    private String id;
    private String name;
    private TechnicalSheetType type;
    private TechnicalSheetStatus status;
    private Integer version;
    private String description;
    private String notes;
    private String organizationId;
    private String productId;
    private Integer targetQuantity;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
