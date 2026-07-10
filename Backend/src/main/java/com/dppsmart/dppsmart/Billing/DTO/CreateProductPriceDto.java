package com.dppsmart.dppsmart.Billing.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateProductPriceDto {
    @NotBlank
    private String productId;
    private String clientId;
    @NotNull @Min(0)
    private Double unitPrice;
    private String currency;
    private LocalDate validFrom;
    private LocalDate validTo;
}
