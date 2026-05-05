package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Product.Entities.MaterialComposition;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ProductResponseDto {

    // Passport metadata
    private String id;
    private String passportId;
    private String publicSlug;
    private Integer version;
    private String lastUpdated;

    // Product identity
    private String companyName;
    private String productName;
    private String variantName;
    private String sku;

    // Detailed fields
    private List<MaterialComposition> materialsComposition;
    private String endOfLifeInstructions;

    // Dynamic extra fields
    private Map<String, Object> extraFields;

    // System
    private String qrUrl;
    private String dppUrl;
    private String organizationId;

    // AI
    private Integer aiScore;
    private List<String> aiMissingFields;
    private String aiSummary;
}
