package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OperationResponseDto {
    private String id;
    private String name;
    private String description;
    private Double defaultDuration;
    private String organizationId;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
