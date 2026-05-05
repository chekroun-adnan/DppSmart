package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OperationSheetItemDto {
    private String id;
    @NotBlank
    private String operationId;
    @NotBlank
    private String userId;
    @Min(1)
    private Integer stepOrder;
    private Double durationEstimate;
    private String notes;
    // populated on response
    private String operationName;
    private String userName;
}
