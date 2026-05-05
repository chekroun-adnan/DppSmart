package com.dppsmart.dppsmart.Product.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class RawMaterialDto {
    @NotBlank
    private String name;
    private String reference;
    private String supplier;
    @NotBlank
    private String unit;
    @Positive
    private Double quantity;
    private String notes;
}
