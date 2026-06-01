package com.dppsmart.dppsmart.MaterialStock.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "material_stock")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialStock {

    @Id
    private String id;
    private String name;
    private String referenceCode;
    private Integer quantity;
    private Integer minimumThreshold;
    private String unit;
    private String organizationId;
    private String createdBy;
    private String lastUpdatedBy;
    private LocalDateTime updatedAt;
    private Integer inProductionQuantity;
    private Integer reservedQuantity;
    private List<String> alternativeRefCodes;
}
