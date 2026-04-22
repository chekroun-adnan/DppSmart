package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

import java.util.List;

@Data
public class CreateProductDto {

    private String id;
    @NotBlank(message = "productName is required")
    private String productName;
    private String category;
    private String material;
    private String certification;
    @NotBlank(message = "organizationId is required")
    private String organizationId;

    private List<ProductionStep> productionSteps;

    private Map<String, Object> additionalInfo;

}
