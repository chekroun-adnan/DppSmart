package com.dppsmart.dppsmart.Product.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Mapper.ProductMapper;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;


import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProductMapper productMapper;
    @Autowired
    private QRCodeService qrCodeService;
    @Autowired
    private OrganizationRepository organizationRepository;

    public ProductResponseDto createProduct(CreateProductDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUser = auth.getName();

        Organization organization = organizationRepository
                .findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        Product product = productMapper.toEntity(dto);

        product.setId(NanoIdUtils.randomNanoId());
        product.setOrganizationId(organization.getId());
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());

        product.setCreatedBy(currentUser);
        product.setUpdatedBy(currentUser);

        Product saved = productRepository.save(product);

        String dppUrl = "http://localhost:8080/api/products/" + saved.getId() + "/dpp";
        saved.setDppUrl(dppUrl);

        String qr = qrCodeService.generateQRCode(dppUrl);
        saved.setQrUrl(qr);

        saved = productRepository.save(saved);

        return productMapper.toDto(saved);
    }

    public ProductResponseDto getProductById(String id) {

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return productMapper.toDto(product);
    }

    public ProductResponseDto getDpp(String id) {
        return getProductById(id);
    }

    public ProductResponseDto updateProduct(CreateProductDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUser = auth.getName();

        Product product = productRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setProductName(dto.getProductName());
        product.setOrganizationId(dto.getOrganizationId());
        product.setCategory(dto.getCategory());
        product.setMaterial(dto.getMaterial());
        product.setCertification(dto.getCertification());
        product.setOrganizationId(dto.getOrganizationId());
        product.setProductionSteps(dto.getProductionSteps());
        product.setAdditionalInfo(dto.getAdditionalInfo());

        product.setUpdatedAt(LocalDateTime.now());
        product.setUpdatedBy(currentUser);

        String dppUrl = "http://localhost:8080/api/products/" + product.getId() + "/dpp";
        product.setDppUrl(dppUrl);

        String qr = qrCodeService.generateQRCode(dppUrl);
        product.setQrUrl(qr);

        Product updated = productRepository.save(product);

        return productMapper.toDto(updated);
    }

    public void deleteProduct(String id) {

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        productRepository.delete(product);
    }

    public List<ProductResponseDto> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(productMapper::toDto)
                .toList();
    }
}
