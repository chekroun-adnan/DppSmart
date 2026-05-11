package com.dppsmart.dppsmart.SupplyChain.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "material_tracking")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialTracking {
    @Id
    private String id;
    private String materialOrderId;
    private Double currentLatitude;
    private Double currentLongitude;
    private String currentStatus;
    private LocalDateTime estimatedArrival;
    private LocalDateTime lastUpdatedAt;
}
