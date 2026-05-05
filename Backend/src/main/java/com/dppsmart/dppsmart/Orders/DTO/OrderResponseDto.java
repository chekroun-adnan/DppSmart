package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrderResponseDto {
    private String id;
    private String orderReference;
    private String productId;
    private String organizationId;
    private Integer quantity;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}

