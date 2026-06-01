package com.dppsmart.dppsmart.Ai.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiChatRequestDto {

    @NotBlank(message = "message is required")
    @Size(max = 4000, message = "message must be 4000 characters or fewer")
    private String message;

    @Size(max = 50, message = "productId must be 50 characters or fewer")
    private String productId;

    @Size(max = 50, message = "organizationId must be 50 characters or fewer")
    private String organizationId;
}
