package com.dppsmart.dppsmart.Production.DTO;

import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductionResponseDto {

    private String id;
    private String productId;
    private String organizationId;
    private ProductionStatus status;
    private int quantity;
    private List<ProductionStep> steps;
    private LocalDateTime createdAt;
}
