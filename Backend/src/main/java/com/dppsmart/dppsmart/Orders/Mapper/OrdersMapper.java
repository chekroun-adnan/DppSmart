package com.dppsmart.dppsmart.Orders.Mapper;

import com.dppsmart.dppsmart.Orders.DTO.OrderResponseDto;
import com.dppsmart.dppsmart.Orders.Entities.Orders;

public class OrdersMapper {
    public static OrderResponseDto toDto(Orders order) {
        OrderResponseDto dto = new OrderResponseDto();
        dto.setId(order.getId());
        dto.setOrderReference(order.getOrderReference());
        dto.setClientId(order.getClientId());
        dto.setOrganizationId(order.getOrganizationId());
        dto.setItems(order.getItems());
        dto.setRequestedDeliveryDate(order.getRequestedDeliveryDate());
        dto.setConfirmedDeliveryDate(order.getConfirmedDeliveryDate());
        dto.setProposedDeliveryDate(order.getProposedDeliveryDate());
        dto.setAdminMessage(order.getAdminMessage());
        dto.setClientResponseMessage(order.getClientResponseMessage());
        dto.setStatus(order.getStatus());
        dto.setTotalQuantity(order.getTotalQuantity());
        dto.setOverallMaterialsSufficient(order.isOverallMaterialsSufficient());
        dto.setRelatedProductionId(order.getRelatedProductionId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setCreatedBy(order.getCreatedBy());
        dto.setUpdatedBy(order.getUpdatedBy());
        return dto;
    }
}
