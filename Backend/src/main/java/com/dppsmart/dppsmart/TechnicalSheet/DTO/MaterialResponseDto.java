package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MaterialResponseDto {
    private String id;
    private String name;
    private String referenceCode;
    private String unit;
    private String organizationId;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
