package com.dppsmart.dppsmart.MaterialStock.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdjustMaterialQuantityDTO {

    @NotBlank(message = "id is required")
    private String id;

    @NotNull(message = "adjustment is required")
    private Integer adjustment;
}
