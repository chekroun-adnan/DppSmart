package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Product.Entities.MaterialComposition;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ProductResponseDto {

    private String id;
    private String passportId;
    private String publicSlug;
    private Integer version;
    private String lastUpdated;

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

    private Integer aiScore;
    private List<String> aiMissingFields;
    private String aiSummary;

    private Double defaultUnitPrice;
    private String currency;
    private Double estimatedUnitPrice;
    private String estimatedCurrency;

    // Packaging configuration
    private Integer unitsPerBox;
    private String boxType;
    private Double boxWeight;
    private String boxDimensions;
    private Boolean allowPartialLastBox;
}
