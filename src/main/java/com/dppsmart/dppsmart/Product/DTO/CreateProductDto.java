package com.dppsmart.dppsmart.Product.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Product.Entities.MaterialComposition;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class CreateProductDto {

    private String id;

    private String companyName;

    @NotBlank(message = "productName is required")
    private String productName;
    private String variantName;
    private String sku;
    private List<MaterialComposition> materialsComposition;
    private String endOfLifeInstructions;
    private Map<String, Object> extraFields;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
}
