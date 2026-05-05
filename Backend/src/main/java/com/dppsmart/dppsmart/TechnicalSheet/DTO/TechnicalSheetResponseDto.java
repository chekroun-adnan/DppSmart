package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TechnicalSheetResponseDto {
    private String id;
    private String name;
    private TechnicalSheetType type;
    private String description;
    private String organizationId;
    private String productId;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
