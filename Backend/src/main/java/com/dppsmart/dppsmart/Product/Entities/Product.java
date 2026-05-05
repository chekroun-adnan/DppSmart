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
    private String publicSlug;
    private Integer version;
private String companyName;
    private String productName;
    private String variantName;
    private String sku;
    private List<MaterialComposition> materialsComposition;
    private String endOfLifeInstructions;
    private Map<String, Object> extraFields;
    private String qrUrl;
    private String dppUrl;
    private String organizationId;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
