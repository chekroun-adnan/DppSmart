package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "technical_sheets")
@Data
public class TechnicalSheet {
    @Id
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
