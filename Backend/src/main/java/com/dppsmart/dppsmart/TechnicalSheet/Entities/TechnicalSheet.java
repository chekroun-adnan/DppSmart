package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "technical_sheets")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TechnicalSheet {
    @Id
    private String id;
    private String name;
    private TechnicalSheetType type;
    private String description;
    private String organizationId;
    private String productId;

    private TechnicalSheetStatus status;
    private String notes;
    private Integer targetQuantity;
    private Integer version;

    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
