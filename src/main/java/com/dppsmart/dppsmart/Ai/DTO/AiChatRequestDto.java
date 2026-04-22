package com.dppsmart.dppsmart.Ai.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiChatRequestDto {
    @NotBlank(message = "message is required")
    private String message;
    private String productId;
    private String organizationId;
}

