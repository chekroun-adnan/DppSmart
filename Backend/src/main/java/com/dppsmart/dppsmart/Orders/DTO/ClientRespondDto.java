package com.dppsmart.dppsmart.Orders.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClientRespondDto {

    @NotBlank(message = "orderId is required")
    private String orderId;

    private String clientResponseMessage;
}
