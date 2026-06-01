package com.dppsmart.dppsmart.ProductStock.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.ProductStock.DTO.AdjustProductQuantityDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.CreateProductStockDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.ProductStockResponseDTO;
import com.dppsmart.dppsmart.ProductStock.DTO.UpdateProductStockDTO;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Mapper.ProductStockMapper;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductStockService {

    private final ProductStockRepository productStockRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductStockMapper productStockMapper;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public ProductStockResponseDTO create(CreateProductStockDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        ProductStock productStock = productStockMapper.toEntity(dto);
        productStock.setId(NanoIdUtils.randomNanoId());
        productStock.setOrganizationId(organization.getId());
        productStock.setCreatedBy(user.getEmail());
        productStock.setUpdatedAt(LocalDateTime.now());
        productStock.setLastUpdatedBy(user.getEmail());

        ProductStock saved = productStockRepository.save(productStock);

        if (organization.getProductStocks() == null) {
            organization.setProductStocks(new ArrayList<>());
        }
        organization.getProductStocks().add(saved);
        organizationRepository.save(organization);

        auditService.log("ProductStock", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Product stock created: " + saved.getProductName());

        notificationService.createNotification(
                user.getId(),
                "Product Stock Created",
                saved.getProductName() + " has been added to inventory",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/product-stock/" + saved.getId()
        );

        return productStockMapper.toDto(saved);
    }

    @Cacheable(value = "allProductStocks")
    public List<ProductStockResponseDTO> getAll() {
        User user = getCurrentUser();
        return productStockRepository.findAll().stream()
                .filter(s -> permissionService.isAdmin(user) || permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(productStockMapper::toDto)
                .toList();
    }

    public ProductStockResponseDTO getById(String id) {
        User user = getCurrentUser();
        ProductStock stock = productStockRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product stock not found"));

        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this product stock");
        }

        return productStockMapper.toDto(stock);
    }

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public ProductStockResponseDTO update(UpdateProductStockDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        ProductStock stock = productStockRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Product stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this product stock");
        }

        applyUpdates(stock, dto);
        stock.setUpdatedAt(LocalDateTime.now());
        stock.setLastUpdatedBy(user.getEmail());

        ProductStock saved = productStockRepository.save(stock);

        updateOrganizationReference(stock.getOrganizationId(), saved);

        auditService.log("ProductStock", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Product stock updated: " + saved.getProductName());

        notificationService.createNotification(
                user.getId(),
                "Product Stock Updated",
                saved.getProductName() + " stock information has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/product-stock/" + saved.getId()
        );

        return productStockMapper.toDto(saved);
    }

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public ProductStockResponseDTO adjustQuantity(AdjustProductQuantityDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        ProductStock stock = productStockRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Product stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to adjust this product stock");
        }

        int newQuantity = stock.getQuantity() + dto.getAdjustment();
        if (newQuantity < 0) {
            throw new ForbiddenException("Insufficient stock. Current: " + stock.getQuantity() + ", Requested adjustment: " + dto.getAdjustment());
        }

        stock.setQuantity(newQuantity);
        stock.setUpdatedAt(LocalDateTime.now());
        stock.setLastUpdatedBy(user.getEmail());

        ProductStock saved = productStockRepository.save(stock);

        updateOrganizationReference(stock.getOrganizationId(), saved);

        String action = dto.getAdjustment() > 0 ? "INCREASE" : "DECREASE";
        auditService.log("ProductStock", saved.getId(), action, saved.getOrganizationId(), null,
                "Product stock " + action.toLowerCase() + ": " + saved.getProductName() + " by " + dto.getAdjustment());

        notificationService.createNotification(
                user.getId(),
                "Product Stock " + (dto.getAdjustment() > 0 ? "Increased" : "Decreased"),
                saved.getProductName() + " quantity " + (dto.getAdjustment() > 0 ? "increased" : "decreased") + " by " + Math.abs(dto.getAdjustment()),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                "/product-stock/" + saved.getId()
        );

        return productStockMapper.toDto(saved);
    }

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public ProductStockResponseDTO addFromProduction(String productName, String productId, int quantity, String unit, String organizationId) {
        return addFromProduction(productName, productId, quantity, unit, organizationId, null);
    }

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public ProductStockResponseDTO addFromProduction(String productName, String productId, int quantity, String unit, String organizationId, String productionId) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        List<ProductStock> existing = productStockRepository.findByProductId(productId);
        ProductStock stock;

        if (!existing.isEmpty()) {
            stock = existing.get(0);
            stock.setQuantity(stock.getQuantity() + quantity);
            stock.setUpdatedAt(LocalDateTime.now());
            stock.setLastUpdatedBy(user.getEmail());
        } else {
            stock = new ProductStock();
            stock.setId(NanoIdUtils.randomNanoId());
            stock.setProductName(productName);
            stock.setProductId(productId);
            stock.setQuantity(quantity);
            stock.setUnit(unit != null ? unit : "units");
            stock.setOrganizationId(organizationId);
            stock.setCreatedBy(user.getEmail());
            stock.setUpdatedAt(LocalDateTime.now());
            stock.setLastUpdatedBy(user.getEmail());
        }

        if (productionId != null) {
            stock.setLastProductionId(productionId);
            stock.setLastProductionAt(LocalDateTime.now());
            stock.setTotalProduced(stock.getTotalProduced() + quantity);
        }

        ProductStock saved = productStockRepository.save(stock);

        updateOrganizationReference(organizationId, saved);

        auditService.log("ProductStock", saved.getId(), "PRODUCTION_COMPLETE", saved.getOrganizationId(), null,
                "Finished products added from production: " + saved.getProductName() + " x" + quantity);

        notificationService.createNotification(
                user.getId(),
                "Production Output Added",
                quantity + " units of " + saved.getProductName() + " added from production",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.PRODUCTION,
                "/product-stock/" + saved.getId()
        );

        return productStockMapper.toDto(saved);
    }

    @CacheEvict(value = {"productStocks", "allProductStocks"}, allEntries = true)
    public void delete(String id) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        ProductStock stock = productStockRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this product stock");
        }

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        productStockRepository.delete(stock);

        if (organization.getProductStocks() != null) {
            organization.getProductStocks().removeIf(s -> s.getId().equals(id));
            organizationRepository.save(organization);
        }

        auditService.log("ProductStock", id, "DELETE", stock.getOrganizationId(), null, "Product stock deleted: " + stock.getProductName());

        notificationService.createNotification(
                user.getId(),
                "Product Stock Deleted",
                stock.getProductName() + " has been removed from inventory",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/product-stock"
        );
    }

    private void applyUpdates(ProductStock stock, UpdateProductStockDTO dto) {
        if (dto.getProductName() != null) {
            stock.setProductName(dto.getProductName());
        }
        if (dto.getProductId() != null) {
            stock.setProductId(dto.getProductId());
        }
        if (dto.getQuantity() != null) {
            stock.setQuantity(dto.getQuantity());
        }
        if (dto.getUnit() != null) {
            stock.setUnit(dto.getUnit());
        }
    }

    private void updateOrganizationReference(String organizationId, ProductStock updatedStock) {
        Organization organization = organizationRepository.findById(organizationId).orElse(null);
        if (organization != null && organization.getProductStocks() != null) {
            for (int i = 0; i < organization.getProductStocks().size(); i++) {
                if (organization.getProductStocks().get(i).getId().equals(updatedStock.getId())) {
                    organization.getProductStocks().set(i, updatedStock);
                    break;
                }
            }
            organizationRepository.save(organization);
        }
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    public void reserveProduct(String productId, int qty) {
        productStockRepository.findByProductId(productId).stream().findFirst().ifPresent(s -> {
            int reserved = (s.getReservedQuantity() != null ? s.getReservedQuantity() : 0) + qty;
            s.setReservedQuantity(reserved);
            productStockRepository.save(s);
        });
    }

    public void releaseProduct(String productId, int qty) {
        productStockRepository.findByProductId(productId).stream().findFirst().ifPresent(s -> {
            int reserved = Math.max(0, (s.getReservedQuantity() != null ? s.getReservedQuantity() : 0) - qty);
            s.setReservedQuantity(reserved);
            productStockRepository.save(s);
        });
    }

    private void validateAdminOrSubAdmin(User user) {
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to perform this action");
        }
    }
}
