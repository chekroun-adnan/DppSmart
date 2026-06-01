package com.dppsmart.dppsmart.ProductStock.Mapper;

import com.dppsmart.dppsmart.ProductStock.DTO.CreateProductStockDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.ProductStockResponseDTO;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import org.springframework.stereotype.Component;

@Component
public class ProductStockMapper {

    public ProductStock toEntity(CreateProductStockDTO dto) {
        ProductStock stock = new ProductStock();
        stock.setProductName(dto.getProductName());
        stock.setProductId(dto.getProductId());
        stock.setQuantity(dto.getQuantity());
        stock.setUnit(dto.getUnit());
        stock.setOrganizationId(dto.getOrganizationId());
        return stock;
    }

    public ProductStockResponseDTO toDto(ProductStock s) {
        ProductStockResponseDTO dto = new ProductStockResponseDTO();
        dto.setId(s.getId());
        dto.setProductName(s.getProductName());
        dto.setProductId(s.getProductId());
        dto.setQuantity(s.getQuantity());
        dto.setUnit(s.getUnit());
        dto.setOrganizationId(s.getOrganizationId());
        dto.setLastUpdatedBy(s.getLastUpdatedBy());
        dto.setUpdatedAt(s.getUpdatedAt());
        dto.setLastProductionId(s.getLastProductionId());
        dto.setLastProductionAt(s.getLastProductionAt());
        dto.setTotalProduced(s.getTotalProduced());
        dto.setReservedQuantity(s.getReservedQuantity() != null ? s.getReservedQuantity() : 0);
        return dto;
    }
}
