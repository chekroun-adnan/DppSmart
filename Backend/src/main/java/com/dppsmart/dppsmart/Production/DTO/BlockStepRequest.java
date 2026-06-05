package com.dppsmart.dppsmart.Production.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BlockStepRequest {
    @NotBlank(message = "Reason is required")
    private String reason;
}
