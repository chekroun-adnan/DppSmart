package com.dppsmart.dppsmart.Production.Mapper;

import com.dppsmart.dppsmart.Production.DTO.ProductionResponseDto;
import com.dppsmart.dppsmart.Production.Entities.Production;
import org.springframework.stereotype.Component;

@Component
public class ProductionMapper {

    public ProductionResponseDto toDto(Production p) {
        ProductionResponseDto dto = new ProductionResponseDto();

        dto.setId(p.getId());
        dto.setProductId(p.getProductId());
        dto.setOrganizationId(p.getOrganizationId());
        dto.setStatus(p.getStatus());
        dto.setQuantity(p.getQuantity());
        dto.setSteps(p.getSteps());
        dto.setCreatedAt(p.getCreatedAt());

        return dto;
    }

    public Production toEntity(Production p) {
        return Production.builder()
                .id(p.getId())
                .productId(p.getProductId())
                .organizationId(p.getOrganizationId())
                .status(p.getStatus())
                .quantity(p.getQuantity())
                .steps(p.getSteps())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}