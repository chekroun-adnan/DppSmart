package com.dppsmart.dppsmart.Production.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReportProgressRequest {
    @NotNull
    @Min(1)
    private Integer quantity;
    private String notes;
    private boolean markComplete;
}
