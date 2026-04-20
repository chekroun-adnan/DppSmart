package com.dppsmart.dppsmart.Stock.Mapper;

import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.DTO.StockResponseDTO;
import com.dppsmart.dppsmart.Stock.Entities.Stock;
import org.springframework.stereotype.Component;

@Component
public class StockMapper {

    public Stock toEntity(CreateStockDTO dto){
        Stock stock = new Stock();

        stock.setMaterialName(dto.getMaterialName());
        stock.setQuantity(dto.getQuantity());
        stock.setUnit(dto.getUnit());
        stock.setMinimumThreshold(dto.getMinimumThreshold());
        stock.setOrganizationId(dto.getOrganizationId());

        return stock;

    }

    public StockResponseDTO toDto(Stock s){
        StockResponseDTO stockResponseDTO = new StockResponseDTO();

        stockResponseDTO.setId(s.getId());
        stockResponseDTO.setUnit(s.getUnit());
        stockResponseDTO.setQuantity(s.getQuantity());
        stockResponseDTO.setMaterialName(s.getMaterialName());
        stockResponseDTO.setMinimumThreshold(s.getMinimumThreshold());
        stockResponseDTO.setOrganizationId(s.getOrganizationId());
        stockResponseDTO.setLastUpdatedBy(s.getLastUpdatedBy());
        stockResponseDTO.setUpdatedAt(s.getUpdatedAt());

        return stockResponseDTO;
    }
}
