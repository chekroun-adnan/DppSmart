package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "ts_operations")
@Data
public class Operation {
    @Id
    private String id;
    private String name;
    private String description;
    private Double defaultDuration;
    private String organizationId;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
