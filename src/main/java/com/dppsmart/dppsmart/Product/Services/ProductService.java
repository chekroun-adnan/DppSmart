package com.dppsmart.dppsmart.Product.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Mapper.ProductMapper;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Ai.Services.ProductAiScoringService;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
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
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PermissionService permissionService;
    @Autowired
    private ProductAiScoringService productAiScoringService;

    public ProductResponseDto createProduct(CreateProductDto dto) {

        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to create products");
        }

        Organization organization = organizationRepository
                .findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Product product = productMapper.toEntity(dto);

        product.setId(NanoIdUtils.randomNanoId());
        product.setOrganizationId(organization.getId());
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());

        product.setCreatedBy(user.getEmail());
        product.setUpdatedBy(user.getEmail());

        Product saved = productRepository.save(product);

        String dppUrl = "http://localhost:8080/api/products/" + saved.getId() + "/dpp";
        saved.setDppUrl(dppUrl);

        String qr = qrCodeService.generateQRCode(dppUrl);
        saved.setQrUrl(qr);

        saved = productRepository.save(saved);

        return enrichWithAi(productMapper.toDto(saved), saved);
    }

    public ProductResponseDto getProductById(String id) {
        User user = getCurrentUser();

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found"));

        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this product");
        }

        return enrichWithAi(productMapper.toDto(product), product);
    }

    public ProductResponseDto getDpp(String id) {
        // DPP is public read, but we still compute AI score locally (no external call)
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        return enrichWithAi(productMapper.toDto(product), product);
    }

    public ProductResponseDto updateProduct(CreateProductDto dto) {

        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update products");
        }

        Product product = productRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Product not found"));

        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this product");
        }

        product.setProductName(dto.getProductName());
        product.setCategory(dto.getCategory());
        product.setMaterial(dto.getMaterial());
        product.setCertification(dto.getCertification());
        if (dto.getOrganizationId() != null && !dto.getOrganizationId().isBlank()) {
            if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to move product to another organization");
            }
            product.setOrganizationId(dto.getOrganizationId());
        }
        product.setProductionSteps(dto.getProductionSteps());
        product.setAdditionalInfo(dto.getAdditionalInfo());

        product.setUpdatedAt(LocalDateTime.now());
        product.setUpdatedBy(user.getEmail());

        String dppUrl = "http://localhost:8080/api/products/" + product.getId() + "/dpp";
        product.setDppUrl(dppUrl);

        String qr = qrCodeService.generateQRCode(dppUrl);
        product.setQrUrl(qr);

        Product updated = productRepository.save(product);

        return enrichWithAi(productMapper.toDto(updated), updated);
    }

    public void deleteProduct(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to delete products");
        }

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found"));

        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this product");
        }

        productRepository.delete(product);
    }

    public List<ProductResponseDto> getAllProducts() {
        User user = getCurrentUser();
        return productRepository.findAll()
                .stream()
                .filter(p -> permissionService.canAccessOrganization(user, p.getOrganizationId()))
                .map(p -> enrichWithAi(productMapper.toDto(p), p))
                .toList();
    }

    private ProductResponseDto enrichWithAi(ProductResponseDto dto, Product product) {
        var score = productAiScoringService.scoreProduct(product);
        dto.setAiScore(score.getScore());
        dto.setAiMissingFields(score.getMissingFields());
        dto.setAiSummary(score.getSummary());
        return dto;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
