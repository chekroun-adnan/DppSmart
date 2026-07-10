package com.dppsmart.dppsmart.Product.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Mapper.ProductMapper;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Ai.Services.ProductAiScoringService;
import com.dppsmart.dppsmart.Billing.Services.CostCalculationService;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.dppsmart.dppsmart.Product.Entities.MaterialComposition;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;

import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
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
    @Autowired
    private AuditService auditService;
    @Autowired
    private NotificationServiceImpl notificationService;
    @Autowired
    private CostCalculationService costCalculationService;
    private final Cloudinary cloudinary;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public ProductService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,


            @Value("${cloudinary.api-secret:}") String apiSecret
    ) {
        if (cloudName == null || cloudName.isBlank() || apiKey == null || apiKey.isBlank() || apiSecret == null || apiSecret.isBlank()) {
            this.cloudinary = null;
        } else {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret
            ));
        }
    }

    @CacheEvict(value = {"products", "allProducts", "dpp"}, allEntries = true)
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
        product.setPublicSlug(generateSlug(dto.getProductName(), dto.getSku()));
        product.setVersion(1);
        product.setOrganizationId(organization.getId());
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());

        product.setCreatedBy(user.getEmail());
        product.setUpdatedBy(user.getEmail());

        Product saved = productRepository.save(product);

        String dppUrl = "http://localhost:8080/api/products/" + saved.getId() + "/dpp";
        saved.setDppUrl(dppUrl);

        String passportUrl = frontendBaseUrl + "/passport/" + saved.getId();
        String qr = qrCodeService.generateSignedQRCode(passportUrl, saved.getId(), 1);
        saved.setQrUrl(qr);

        saved = productRepository.save(saved);

        auditService.log("Product", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Product created: " + saved.getProductName());

        notificationService.createNotification(
                user.getId(),
                "New Product Created",
                saved.getProductName() + " has been added to the product catalog",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                "/products/" + saved.getId()
        );

        return enrichWithAi(productMapper.toDto(saved), saved);
    }

    @Cacheable(value = "products", key = "#id")
    public ProductResponseDto getProductById(String id) {
        User user = getCurrentUser();

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found"));

        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this product");
        }

        return enrichWithAi(productMapper.toDto(product), product);
    }

    @Cacheable(value = "dpp", key = "#id")
    public ProductResponseDto getDpp(String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        return enrichWithAi(productMapper.toDto(product), product);
    }

    @CacheEvict(value = {"products", "allProducts", "dpp"}, allEntries = true)
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

        product.setCompanyName(dto.getCompanyName());
        product.setProductName(dto.getProductName());
        product.setVariantName(dto.getVariantName());
        product.setSku(dto.getSku());
        product.setMaterialsComposition(dto.getMaterialsComposition());
        product.setEndOfLifeInstructions(dto.getEndOfLifeInstructions());
        product.setExtraFields(dto.getExtraFields());
        if (dto.getOrganizationId() != null && !dto.getOrganizationId().isBlank()) {
            if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to move product to another organization");
            }
            product.setOrganizationId(dto.getOrganizationId());
        }
        product.setPublicSlug(generateSlug(dto.getProductName(), dto.getSku()));
        product.setVersion(product.getVersion() != null ? product.getVersion() + 1 : 1);
        product.setUpdatedAt(LocalDateTime.now());
        product.setUpdatedBy(user.getEmail());

        String dppUrl = "http://localhost:8080/api/products/" + product.getId() + "/dpp";
        product.setDppUrl(dppUrl);

        String passportUrl = frontendBaseUrl + "/passport/" + product.getId();
        String qr = qrCodeService.generateSignedQRCode(passportUrl, product.getId(),
                product.getVersion() != null ? product.getVersion() + 1 : 1);
        product.setQrUrl(qr);

        Product updated = productRepository.save(product);

        auditService.log("Product", updated.getId(), "UPDATE", updated.getOrganizationId(), null, "Product updated: " + updated.getProductName());

        notificationService.createNotification(
                user.getId(),
                "Product Updated",
                updated.getProductName() + " has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                "/products/" + updated.getId()
        );

        return enrichWithAi(productMapper.toDto(updated), updated);
    }

    @CacheEvict(value = {"products", "allProducts", "dpp"}, allEntries = true)
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

        String orgId = product.getOrganizationId();
        String productName = product.getProductName();
        productRepository.delete(product);

        auditService.log("Product", id, "DELETE", orgId, null, "Product deleted: " + productName);

        notificationService.createNotification(
                user.getId(),
                "Product Deleted",
                productName + " has been removed from the product catalog",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                "/products"
        );
    }

    @CacheEvict(value = {"products", "allProducts", "dpp"}, allEntries = true)
    public ProductResponseDto uploadProductImage(String productId, MultipartFile file) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to upload product images");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }
        if (cloudinary == null) {
            throw new BadRequestException("Cloudinary is not configured on backend");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));

        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this product");
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "smartdpp/products",
                            "resource_type", "image",
                            "public_id", "product-" + product.getId() + "-" + System.currentTimeMillis()
                    )
            );
            String imageUrl = String.valueOf(uploadResult.get("secure_url"));

            Map<String, Object> extraFields = product.getExtraFields();
            if (extraFields == null) {
                extraFields = new HashMap<>();
            } else {
                extraFields = new HashMap<>(extraFields);
            }
            extraFields.put("imageUrl", imageUrl);
            product.setExtraFields(extraFields);
            product.setUpdatedAt(LocalDateTime.now());
            product.setUpdatedBy(user.getEmail());

            Product saved = productRepository.save(product);
            return enrichWithAi(productMapper.toDto(saved), saved);
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload image to cloud");
        }
    }

    @Cacheable(value = "allProducts")
    public List<ProductResponseDto> getAllProducts() {
        User user = getCurrentUser();

        if (user.getRole() == Roles.CLIENT) {
            return productRepository.findAll()
                    .stream()
                    .map(p -> enrichWithAi(productMapper.toDto(p), p))
                    .toList();
        }

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

        // Enrich with estimated cost-based price
        if (product.getOrganizationId() != null) {
            try {
                var cost = costCalculationService.calculateEstimatedUnitPrice(
                        product.getId(), product.getOrganizationId());
                if (cost.hasMaterialSheet() || cost.hasOperationSheet()) {
                    dto.setEstimatedUnitPrice(cost.estimatedUnitPrice() > 0 ? cost.estimatedUnitPrice() : null);
                    dto.setEstimatedCurrency(cost.currency());
                }
            } catch (Exception e) {
                log.warn("Failed to calculate estimated price for product {}: {}", product.getId(), e.getMessage());
            }
        }

        return dto;
    }

    private String generateSlug(String name, String sku) {
        String base = (name != null ? name.trim() : "")
                + (sku != null && !sku.trim().isEmpty() ? "-" + sku.trim() : "");
        return base.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @CacheEvict(value = {"products", "allProducts", "dpp"}, allEntries = true)
    public List<ProductResponseDto> importProductsFromCsv(MultipartFile file, String organizationId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to import products");
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        List<ProductResponseDto> createdProducts = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            List<String[]> rows = reader.readAll();

            if (rows.isEmpty()) {
                throw new BadRequestException("CSV file is empty");
            }

            String[] headers = rows.get(0);
            for (int i = 1; i < rows.size(); i++) {
                String[] row = rows.get(i);
                CreateProductDto dto = mapRowToDto(headers, row, organizationId);
                ProductResponseDto created = createProduct(dto);
                createdProducts.add(created);
            }

        } catch (IOException | CsvException e) {
            throw new BadRequestException("Failed to parse CSV file: " + e.getMessage());
        }

        return createdProducts;
    }

    private static final Pattern MATERIAL_PATTERN =
            Pattern.compile("^material_(\\d+)_(name|percentage|recycled_content|recycled_percentage)$");

    private CreateProductDto mapRowToDto(String[] headers, String[] row, String organizationId) {
        CreateProductDto dto = new CreateProductDto();
        dto.setOrganizationId(organizationId);

        Map<String, Object> extraFields = new HashMap<>();
        TreeMap<Integer, MaterialComposition> materialsMap = new TreeMap<>();

        for (int i = 0; i < headers.length && i < row.length; i++) {
            String rawHeader = headers[i].trim();
            String header = rawHeader.toLowerCase().replaceAll("\\s+", "_");
            String value = row[i] != null ? row[i].trim() : "";

            switch (header) {
                case "productname", "product_name" -> dto.setProductName(value);
                case "companyname", "company_name" -> dto.setCompanyName(value);
                case "variantname", "variant_name" -> dto.setVariantName(value);
                case "sku" -> dto.setSku(value);
                case "endoflifeinstructions", "end_of_life_instructions" -> dto.setEndOfLifeInstructions(value);
                default -> {
                    Matcher m = MATERIAL_PATTERN.matcher(header);
                    if (m.matches()) {
                        int idx = Integer.parseInt(m.group(1));
                        String field = m.group(2);
                        MaterialComposition mat = materialsMap.computeIfAbsent(idx, k -> new MaterialComposition());
                        switch (field) {
                            case "name" -> mat.setMaterialName(value);
                            case "percentage" -> {
                                try { mat.setPercentage(Double.parseDouble(value)); } catch (NumberFormatException ignored) {}
                            }
                            case "recycled_content" -> mat.setRecycledContent(
                                    "true".equalsIgnoreCase(value) || "yes".equalsIgnoreCase(value) || "1".equals(value));
                            case "recycled_percentage" -> {
                                try { mat.setRecycledPercentage(Double.parseDouble(value)); } catch (NumberFormatException ignored) {}
                            }
                        }
                    } else if (!value.isEmpty()) {
                        extraFields.put(rawHeader, value);
                    }
                }
            }
        }

        List<MaterialComposition> materials = materialsMap.values().stream()
                .filter(mat -> mat.getMaterialName() != null && !mat.getMaterialName().isBlank())
                .toList();
        if (!materials.isEmpty()) {
            dto.setMaterialsComposition(materials);
        }

        if (!extraFields.isEmpty()) {
            dto.setExtraFields(extraFields);
        }

        return dto;
    }
}
