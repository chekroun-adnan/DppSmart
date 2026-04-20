package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Product.Entities.ProductionStep;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ProductResponseDto {

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

}
