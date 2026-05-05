package com.dppsmart.dppsmart.Product.Entities;

import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TechnicalSheet {
    private String version;
    private String preparedBy;
    private LocalDate date;
    private List<RawMaterial> rawMaterials;
    private List<ProductionStep> productionSteps;
}
