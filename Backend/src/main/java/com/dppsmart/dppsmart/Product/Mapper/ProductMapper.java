package com.dppsmart.dppsmart.Product.Mapper;

import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
public class ProductMapper {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public Product toEntity(CreateProductDto dto) {
        Product product = new Product();
        product.setCompanyName(dto.getCompanyName());
        product.setProductName(dto.getProductName());
        product.setVariantName(dto.getVariantName());
        product.setSku(dto.getSku());
        product.setMaterialsComposition(dto.getMaterialsComposition());
        product.setEndOfLifeInstructions(dto.getEndOfLifeInstructions());
        product.setExtraFields(dto.getExtraFields());
        product.setOrganizationId(dto.getOrganizationId());
        return product;
    }

    public ProductResponseDto toDto(Product p) {
        ProductResponseDto dto = new ProductResponseDto();
        dto.setId(p.getId());
        dto.setPassportId(p.getId());
        dto.setPublicSlug(p.getPublicSlug());
        dto.setVersion(p.getVersion());
        dto.setLastUpdated(p.getUpdatedAt() != null ? p.getUpdatedAt().format(FORMATTER) : null);
        dto.setCompanyName(p.getCompanyName());
        dto.setProductName(p.getProductName());
        dto.setVariantName(p.getVariantName());
        dto.setSku(p.getSku());
        dto.setMaterialsComposition(p.getMaterialsComposition());
        dto.setEndOfLifeInstructions(p.getEndOfLifeInstructions());
        dto.setExtraFields(p.getExtraFields());
        dto.setQrUrl(p.getQrUrl());
        dto.setDppUrl(p.getDppUrl());
        dto.setOrganizationId(p.getOrganizationId());
        return dto;
    }
}
