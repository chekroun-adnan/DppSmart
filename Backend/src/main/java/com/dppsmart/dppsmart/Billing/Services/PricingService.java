package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Billing.DTO.CreateProductPriceDto;
import com.dppsmart.dppsmart.Billing.DTO.ProductPriceDto;
import com.dppsmart.dppsmart.Billing.Entities.ProductPrice;
import com.dppsmart.dppsmart.Billing.Repositories.ProductPriceRepository;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PricingService {

    @Autowired private ProductPriceRepository productPriceRepository;
    @Autowired private PermissionService permissionService;

    public List<ProductPriceDto> getPrices(String organizationId, String productId, String clientId) {
        List<ProductPrice> prices;
        if (productId != null) {
            prices = productPriceRepository.findByProductId(productId);
        } else if (clientId != null) {
            prices = productPriceRepository.findByClientId(clientId);
        } else {
            prices = productPriceRepository.findByOrganizationId(organizationId);
        }
        return prices.stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProductPriceDto getPrice(String id) {
        ProductPrice price = productPriceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product price not found: " + id));
        return toDto(price);
    }

    public ProductPriceDto createPrice(CreateProductPriceDto dto, User user) {
        ProductPrice price = new ProductPrice();
        price.setProductId(dto.getProductId());
        price.setClientId(dto.getClientId());
        price.setUnitPrice(dto.getUnitPrice());
        price.setCurrency(dto.getCurrency() != null ? dto.getCurrency() : "MAD");
        price.setValidFrom(dto.getValidFrom() != null ? dto.getValidFrom() : LocalDate.now());
        price.setValidTo(dto.getValidTo() != null ? dto.getValidTo() : LocalDate.of(2099, 12, 31));
        price.setOrganizationId(user.getOrganizationId());
        price.setCreatedBy(user.getEmail());
        price.setCreatedAt(LocalDateTime.now());
        price.setUpdatedAt(LocalDateTime.now());
        productPriceRepository.save(price);
        return toDto(price);
    }

    public ProductPriceDto updatePrice(String id, CreateProductPriceDto dto) {
        ProductPrice price = productPriceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product price not found: " + id));
        price.setUnitPrice(dto.getUnitPrice());
        if (dto.getCurrency() != null) price.setCurrency(dto.getCurrency());
        if (dto.getValidFrom() != null) price.setValidFrom(dto.getValidFrom());
        if (dto.getValidTo() != null) price.setValidTo(dto.getValidTo());
        price.setUpdatedAt(LocalDateTime.now());
        productPriceRepository.save(price);
        return toDto(price);
    }

    public void deletePrice(String id) {
        if (!productPriceRepository.existsById(id)) {
            throw new NotFoundException("Product price not found: " + id);
        }
        productPriceRepository.deleteById(id);
    }

    public Optional<ProductPrice> resolvePrice(String productId, String clientId) {
        LocalDate today = LocalDate.now();
        Optional<ProductPrice> clientPrice = productPriceRepository
                .findFirstByProductIdAndClientIdAndValidFromLessThanEqualAndValidToGreaterThanEqualOrderByCreatedAtDesc(
                        productId, clientId, today, today);
        if (clientPrice.isPresent()) return clientPrice;
        return productPriceRepository
                .findFirstByProductIdAndClientIdIsNullAndValidFromLessThanEqualAndValidToGreaterThanEqualOrderByCreatedAtDesc(
                        productId, today, today);
    }

    private ProductPriceDto toDto(ProductPrice price) {
        if (price == null) return null;
        ProductPriceDto dto = new ProductPriceDto();
        dto.setId(price.getId());
        dto.setProductId(price.getProductId());
        dto.setClientId(price.getClientId());
        dto.setUnitPrice(price.getUnitPrice());
        dto.setCurrency(price.getCurrency());
        dto.setValidFrom(price.getValidFrom());
        dto.setValidTo(price.getValidTo());
        dto.setOrganizationId(price.getOrganizationId());
        dto.setCreatedBy(price.getCreatedBy());
        dto.setCreatedAt(price.getCreatedAt());
        return dto;
    }
}
