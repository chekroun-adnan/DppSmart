package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

import java.util.List;

@Data
public class GenerateStepsResponse {
    private String orderId;
    private String orderReference;
    private int stepsGenerated;
    private List<ProductionStepDto> steps;
    private String warning;
}
