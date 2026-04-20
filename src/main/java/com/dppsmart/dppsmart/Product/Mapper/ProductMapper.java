package com.dppsmart.dppsmart.Product.Mapper;

import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Entities.Product;

import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public Product toEntity(CreateProductDto dto) {

        Product product = new Product();

        product.setProductName(dto.getProductName());
        product.setCategory(dto.getCategory());
        product.setMaterial(dto.getMaterial());
        product.setCertification(dto.getCertification());
        product.setOrganizationId(dto.getOrganizationId());
        product.setProductionSteps(dto.getProductionSteps());
        product.setAdditionalInfo(dto.getAdditionalInfo());

        return product;
    }

    public ProductResponseDto toDto(Product p) {

        ProductResponseDto dto = new ProductResponseDto();

        dto.setId(p.getId());
        dto.setProductName(p.getProductName());
        dto.setCategory(p.getCategory());
        dto.setMaterial(p.getMaterial());
        dto.setCertification(p.getCertification());
        dto.setQrUrl(p.getQrUrl());
        dto.setDppUrl(p.getDppUrl());
        dto.setOrganizationId(p.getOrganizationId());
        dto.setProductionSteps(p.getProductionSteps());
        dto.setAdditionalInfo(p.getAdditionalInfo());

        return dto;
    }
}
