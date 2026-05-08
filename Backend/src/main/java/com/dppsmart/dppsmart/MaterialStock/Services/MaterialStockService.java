package com.dppsmart.dppsmart.MaterialStock.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.DTO.AdjustMaterialQuantityDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.CreateMaterialStockDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.MaterialStockResponseDTO;
import com.dppsmart.dppsmart.MaterialStock.DTO.UpdateMaterialStockDTO;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Mapper.MaterialStockMapper;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
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
public class MaterialStockService {

    private final MaterialStockRepository materialStockRepository;
    private final OrganizationRepository organizationRepository;
    private final MaterialStockMapper materialStockMapper;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public MaterialStockResponseDTO create(CreateMaterialStockDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        MaterialStock materialStock = materialStockMapper.toEntity(dto);
        materialStock.setId(NanoIdUtils.randomNanoId());
        materialStock.setOrganizationId(organization.getId());
        materialStock.setCreatedBy(user.getEmail());
        materialStock.setUpdatedAt(LocalDateTime.now());
        materialStock.setLastUpdatedBy(user.getEmail());

        MaterialStock saved = materialStockRepository.save(materialStock);

        if (organization.getMaterialStocks() == null) {
            organization.setMaterialStocks(new ArrayList<>());
        }
        organization.getMaterialStocks().add(saved);
        organizationRepository.save(organization);

        auditService.log("MaterialStock", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Material stock created: " + saved.getName());

        return materialStockMapper.toDto(saved);
    }

    @Cacheable(value = "allMaterialStocks")
    public List<MaterialStockResponseDTO> getAll() {
        User user = getCurrentUser();
        return materialStockRepository.findAll().stream()
                .filter(s -> permissionService.isAdmin(user) || permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(materialStockMapper::toDto)
                .toList();
    }

    public MaterialStockResponseDTO getById(String id) {
        User user = getCurrentUser();
        MaterialStock stock = materialStockRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material stock not found"));

        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this material stock");
        }

        return materialStockMapper.toDto(stock);
    }

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public MaterialStockResponseDTO update(UpdateMaterialStockDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialStock stock = materialStockRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Material stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this material stock");
        }

        applyUpdates(stock, dto);
        stock.setUpdatedAt(LocalDateTime.now());
        stock.setLastUpdatedBy(user.getEmail());

        MaterialStock saved = materialStockRepository.save(stock);

        updateOrganizationReference(stock.getOrganizationId(), saved);

        auditService.log("MaterialStock", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Material stock updated: " + saved.getName());

        return materialStockMapper.toDto(saved);
    }

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public MaterialStockResponseDTO adjustQuantity(AdjustMaterialQuantityDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialStock stock = materialStockRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Material stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to adjust this material stock");
        }

        int newQuantity = stock.getQuantity() + dto.getAdjustment();
        if (newQuantity < 0) {
            throw new ForbiddenException("Insufficient stock. Current: " + stock.getQuantity() + ", Requested adjustment: " + dto.getAdjustment());
        }

        stock.setQuantity(newQuantity);
        stock.setUpdatedAt(LocalDateTime.now());
        stock.setLastUpdatedBy(user.getEmail());

        MaterialStock saved = materialStockRepository.save(stock);

        updateOrganizationReference(stock.getOrganizationId(), saved);

        String action = dto.getAdjustment() > 0 ? "INCREASE" : "DECREASE";
        auditService.log("MaterialStock", saved.getId(), action, saved.getOrganizationId(), null,
                "Material stock " + action.toLowerCase() + ": " + saved.getName() + " by " + dto.getAdjustment());

        return materialStockMapper.toDto(saved);
    }

    public List<MaterialStockResponseDTO> getLowStockItems(String organizationId) {
        User user = getCurrentUser();
        List<MaterialStock> stocks;
        if (organizationId != null && !organizationId.isBlank()) {
            if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, organizationId)) {
                throw new ForbiddenException("You are not allowed to access this organization");
            }
            stocks = materialStockRepository.findByOrganizationId(organizationId);
        } else {
            stocks = materialStockRepository.findAll();
        }

        return stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .map(materialStockMapper::toDto)
                .toList();
    }

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public void consumeMaterials(List<MaterialConsumptionDTO> consumptions) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        for (MaterialConsumptionDTO consumption : consumptions) {
            MaterialStock stock = materialStockRepository.findById(consumption.materialStockId())
                    .orElseThrow(() -> new NotFoundException("Material stock not found: " + consumption.materialStockId()));

            if (stock.getQuantity() < consumption.quantity()) {
                throw new ForbiddenException("Insufficient stock for " + stock.getName() +
                        ". Available: " + stock.getQuantity() + ", Required: " + consumption.quantity());
            }

            stock.setQuantity(stock.getQuantity() - consumption.quantity());
            stock.setUpdatedAt(LocalDateTime.now());
            stock.setLastUpdatedBy(user.getEmail());
            materialStockRepository.save(stock);

            auditService.log("MaterialStock", stock.getId(), "CONSUME", stock.getOrganizationId(), null,
                    "Material consumed for production: " + stock.getName() + " x" + consumption.quantity());
        }
    }

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public void delete(String id) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialStock stock = materialStockRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material stock not found"));

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this material stock");
        }

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        materialStockRepository.delete(stock);

        if (organization.getMaterialStocks() != null) {
            organization.getMaterialStocks().removeIf(s -> s.getId().equals(id));
            organizationRepository.save(organization);
        }

        auditService.log("MaterialStock", id, "DELETE", stock.getOrganizationId(), null, "Material stock deleted: " + stock.getName());
    }

    private void applyUpdates(MaterialStock stock, UpdateMaterialStockDTO dto) {
        if (dto.getName() != null) {
            stock.setName(dto.getName());
        }
        if (dto.getReferenceCode() != null) {
            stock.setReferenceCode(dto.getReferenceCode());
        }
        if (dto.getQuantity() != null) {
            stock.setQuantity(dto.getQuantity());
        }
        if (dto.getUnit() != null) {
            stock.setUnit(dto.getUnit());
        }
        if (dto.getMinimumThreshold() != null) {
            stock.setMinimumThreshold(dto.getMinimumThreshold());
        }
    }

    private void updateOrganizationReference(String organizationId, MaterialStock updatedStock) {
        Organization organization = organizationRepository.findById(organizationId).orElse(null);
        if (organization != null && organization.getMaterialStocks() != null) {
            for (int i = 0; i < organization.getMaterialStocks().size(); i++) {
                if (organization.getMaterialStocks().get(i).getId().equals(updatedStock.getId())) {
                    organization.getMaterialStocks().set(i, updatedStock);
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

    private void validateAdminOrSubAdmin(User user) {
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to perform this action");
        }
    }

    public record MaterialConsumptionDTO(String materialStockId, int quantity) {}
}
