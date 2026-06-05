package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

import java.util.List;

@Data
public class OrderProductionDto {
    private String orderId;
    private String orderReference;
    private String clientName;
    private String organizationId;
    private String organizationName;
    private List<OrderProductionItemDto> items;
    private int totalQuantity;
    private int completedSteps;
    private int totalSteps;
    private int progressPercent;
    private String status;
    private boolean stepsGenerated;
    private String currentOperation;
    private String nextOperation;
    private String estimatedCompletionTime;
    private String warning;
}
