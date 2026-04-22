package com.dppsmart.dppsmart.Ai.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiAskRequestDto {
    @NotBlank(message = "message is required")
    private String message;
}

