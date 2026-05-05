package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.Data;

@Data
public class UpdateOperationDto {
    private String name;
    private String description;
    private Double defaultDuration;
}
