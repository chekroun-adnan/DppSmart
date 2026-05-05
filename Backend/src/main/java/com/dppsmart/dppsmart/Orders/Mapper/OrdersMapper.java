package com.dppsmart.dppsmart.Orders.Mapper;

import com.dppsmart.dppsmart.Orders.DTO.OrderResponseDto;
import com.dppsmart.dppsmart.Orders.Entities.Orders;

public class OrdersMapper {
    public static OrderResponseDto toDto(Orders order) {
        OrderResponseDto dto = new OrderResponseDto();
        dto.setId(order.getId());
        dto.setOrderReference(order.getOrderReference());
        dto.setProductId(order.getProductId());
        dto.setOrganizationId(order.getOrganizationId());
        dto.setQuantity(order.getQuantity());
        dto.setStatus(order.getStatus());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setCreatedBy(order.getCreatedBy());
        dto.setUpdatedBy(order.getUpdatedBy());
        return dto;
    }
}

