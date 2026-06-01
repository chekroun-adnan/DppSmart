package com.dppsmart.dppsmart.ProductionCapacity.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "production_capacity")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductionCapacity {
    @Id
    private String id;
    private String organizationId;
    private String workstationName;
    private String workstationType;
    private int dailyCapacity;
    private int currentLoad;
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
