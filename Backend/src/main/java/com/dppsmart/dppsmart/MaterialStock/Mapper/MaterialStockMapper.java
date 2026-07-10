package com.dppsmart.dppsmart.MaterialStock.Mapper;

import com.dppsmart.dppsmart.MaterialStock.DTO.CreateMaterialStockDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.MaterialStockResponseDTO;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import org.springframework.stereotype.Component;

@Component
public class MaterialStockMapper {

    public MaterialStock toEntity(CreateMaterialStockDTO dto) {
        MaterialStock stock = new MaterialStock();
        stock.setName(dto.getName());
        stock.setReferenceCode(dto.getReferenceCode());
        stock.setQuantity(dto.getQuantity());
        stock.setUnit(dto.getUnit());
        stock.setMinimumThreshold(dto.getMinimumThreshold());
        stock.setOrganizationId(dto.getOrganizationId());
        stock.setUnitPrice(dto.getUnitPrice());
        stock.setCostCurrency(dto.getCostCurrency() != null && !dto.getCostCurrency().isBlank()
                ? dto.getCostCurrency() : "MAD");
        stock.setSupplier(dto.getSupplier());
        return stock;
    }

    public MaterialStockResponseDTO toDto(MaterialStock s) {
        MaterialStockResponseDTO dto = new MaterialStockResponseDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setReferenceCode(s.getReferenceCode());
        dto.setQuantity(s.getQuantity());
        dto.setMinimumThreshold(s.getMinimumThreshold());
        dto.setUnit(s.getUnit());
        dto.setOrganizationId(s.getOrganizationId());
        dto.setLastUpdatedBy(s.getLastUpdatedBy());
        dto.setUpdatedAt(s.getUpdatedAt());
        dto.setUnitPrice(s.getUnitPrice());
        dto.setCostCurrency(s.getCostCurrency() != null ? s.getCostCurrency() : "MAD");
        dto.setSupplier(s.getSupplier());
        return dto;
    }
}
