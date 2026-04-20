package com.dppsmart.dppsmart.Product.Entities;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "products")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Product {

    @Id
    private String id;
    private String productName;
    private String category;
    private String material;
    private String certification;
    private String qrUrl;
    private String dppUrl;
    private String organizationId;
    private List<ProductionStep> productionSteps;
    private Map<String, Object> additionalInfo;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
