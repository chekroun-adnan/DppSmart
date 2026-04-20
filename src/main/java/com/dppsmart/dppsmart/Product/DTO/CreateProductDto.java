package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Product.Entities.ProductionStep;
import lombok.Data;

import java.util.Map;

import java.util.List;

@Data
public class CreateProductDto {

    private String id;
    private String productName;
    private String category;
    private String material;
    private String certification;
    private String organizationId;

    private List<ProductionStep> productionSteps;

    private Map<String, Object> additionalInfo;

}
