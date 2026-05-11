package com.dppsmart.dppsmart.SupplyChain.Mapper;

import com.dppsmart.dppsmart.SupplyChain.DTO.MaterialOrderItemResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.MaterialOrderResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import org.springframework.stereotype.Component;

@Component
public class MaterialOrderMapper {
    public MaterialOrderResponseDTO toDto(MaterialOrder order) {
        MaterialOrderResponseDTO dto = new MaterialOrderResponseDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setSupplierId(order.getSupplierId());
        dto.setOrganizationId(order.getOrganizationId());
        dto.setOrderedBy(order.getOrderedBy());
        dto.setStatus(order.getStatus());
        dto.setExpectedDeliveryDate(order.getExpectedDeliveryDate());
        dto.setNotes(order.getNotes());
        dto.setTotalOrderedQuantity(order.getTotalOrderedQuantity());
        dto.setTotalApprovedQuantity(order.getTotalApprovedQuantity());
        dto.setTotalRejectedQuantity(order.getTotalRejectedQuantity());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        if (order.getItems() != null) {
            dto.setItems(order.getItems().stream().map(this::toItemDto).toList());
        }
        return dto;
    }

    public MaterialOrderItemResponseDTO toItemDto(MaterialOrderItem item) {
        MaterialOrderItemResponseDTO dto = new MaterialOrderItemResponseDTO();
        dto.setId(item.getId());
        dto.setMaterialId(item.getMaterialId());
        dto.setMaterialName(item.getMaterialName());
        dto.setMaterialReference(item.getMaterialReference());
        dto.setOrderedQuantity(item.getOrderedQuantity());
        dto.setApprovedQuantity(item.getApprovedQuantity());
        dto.setRejectedQuantity(item.getRejectedQuantity());
        dto.setUnit(item.getUnit());
        dto.setConditionStatus(item.getConditionStatus());
        dto.setNotes(item.getNotes());
        return dto;
    }
}
