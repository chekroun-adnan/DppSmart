package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOperationDto {
    @NotBlank
    private String name;
    private String description;
    private Double defaultDuration;
    @NotBlank
    private String organizationId;
}
