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
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Email.Services.AdminAlertService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import lombok.extern.slf4j.Slf4j;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomCalculationResultDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaterialStockService {

    private final MaterialStockRepository materialStockRepository;
    private final OrganizationRepository organizationRepository;
    private final MaterialStockMapper materialStockMapper;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final AdminAlertService adminAlertService;
    private final OrdersRepository ordersRepository;
    private final SecurityAnalysisService securityAnalysisService;
    private final RuleDetectionService ruleDetectionService;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private TechnicalSheetModuleService technicalSheetModuleService;

    @Autowired
    public void setTechnicalSheetModuleService(@Lazy TechnicalSheetModuleService technicalSheetModuleService) {
        this.technicalSheetModuleService = technicalSheetModuleService;
    }

    @CacheEvict(value = {"materialStocks", "allMaterialStocks"}, allEntries = true)
    public MaterialStockResponseDTO create(CreateMaterialStockDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        MaterialStock existing = findExistingStock(dto.getReferenceCode(), dto.getName(), dto.getUnit(), organization.getId());

        MaterialStock materialStock;
        if (existing != null) {

            log.info("CREATE MATERIAL STOCK: found existing id={} for ref={}/name={}, updating in-place",
                    existing.getId(), dto.getReferenceCode(), dto.getName());
            existing.setName(dto.getName());
            existing.setReferenceCode(dto.getReferenceCode());
            existing.setQuantity(dto.getQuantity());
            existing.setMinimumThreshold(dto.getMinimumThreshold());
            existing.setUnit(dto.getUnit());
            existing.setLastUpdatedBy(user.getEmail());
            existing.setUpdatedAt(LocalDateTime.now());
            materialStock = existing;
        } else {
            materialStock = materialStockMapper.toEntity(dto);
            materialStock.setId(NanoIdUtils.randomNanoId());
            materialStock.setOrganizationId(organization.getId());
            materialStock.setCreatedBy(user.getEmail());
            materialStock.setUpdatedAt(LocalDateTime.now());
            materialStock.setLastUpdatedBy(user.getEmail());
        }

        MaterialStock saved = materialStockRepository.save(materialStock);

        relinkBomItems(saved);

        if (organization.getMaterialStocks() == null) {
            organization.setMaterialStocks(new ArrayList<>());
        }
        organization.getMaterialStocks().add(saved);
        organizationRepository.save(organization);

        auditService.log("MaterialStock", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Material stock created: " + saved.getName());

        notificationService.createNotification(
                user.getId(),
                "Material Stock Created",
                saved.getName() + " has been added to inventory",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/material-stock/" + saved.getId()
        );

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

        int oldQty = stock.getQuantity() != null ? stock.getQuantity() : 0;
        applyUpdates(stock, dto);
        stock.setUpdatedAt(LocalDateTime.now());
        stock.setLastUpdatedBy(user.getEmail());

        MaterialStock saved = materialStockRepository.save(stock);

        updateOrganizationReference(stock.getOrganizationId(), saved);
        adminAlertService.checkAndAlertLowStock(saved);

        auditService.log("MaterialStock", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Material stock updated: " + saved.getName());

        notificationService.createNotification(
                user.getId(),
                "Material Stock Updated",
                saved.getName() + " stock information has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/material-stock/" + saved.getId()
        );

        
        int newQty = saved.getQuantity() != null ? saved.getQuantity() : 0;
        if (newQty > oldQty) {
            recheckBlockedOrders(saved.getOrganizationId(), user.getEmail());
        }

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
        adminAlertService.checkAndAlertLowStock(saved);
        if (dto.getAdjustment() < 0) {
            triggerAutoPurchaseOrderIfNeeded(saved);
        }

        var stockAlert = ruleDetectionService.detectStockAnomaly(
                saved.getId(), saved.getName(),
                stock.getQuantity() - dto.getAdjustment(), saved.getQuantity(),
                saved.getOrganizationId(), user.getEmail(), null);
        if (stockAlert != null) {
            securityAnalysisService.analyzeAndAlert(stockAlert);
        }

        String action = dto.getAdjustment() > 0 ? "INCREASE" : "DECREASE";
        auditService.log("MaterialStock", saved.getId(), action, saved.getOrganizationId(), null,
                "Material stock " + action.toLowerCase() + ": " + saved.getName() + " by " + dto.getAdjustment());

        notificationService.createNotification(
                user.getId(),
                "Stock Quantity " + (dto.getAdjustment() > 0 ? "Increased" : "Decreased"),
                saved.getName() + " quantity " + (dto.getAdjustment() > 0 ? "increased" : "decreased") + " by " + Math.abs(dto.getAdjustment()),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                "/material-stock/" + saved.getId()
        );

        
        if (dto.getAdjustment() > 0) {
            recheckBlockedOrders(saved.getOrganizationId(), user.getEmail());
        }

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
            MaterialStock savedConsumed = materialStockRepository.save(stock);
            adminAlertService.checkAndAlertLowStock(savedConsumed);
            triggerAutoPurchaseOrderIfNeeded(savedConsumed);

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

        notificationService.createNotification(
                user.getId(),
                "Material Stock Deleted",
                stock.getName() + " has been removed from inventory",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/material-stock"
        );
    }

    private void recheckBlockedOrders(String organizationId, String updatedBy) {
        List<Orders> blocked = ordersRepository.findAll().stream()
                .filter(o -> organizationId.equals(o.getOrganizationId()))
                .filter(o -> o.getStatus() == ClientOrderStatus.BLOCKED_INSUFFICIENT_MATERIALS
                        || o.getStatus() == ClientOrderStatus.BLOCKED_INSUFFICIENT_STOCK)
                .toList();

        for (Orders order : blocked) {
            try {
                boolean allMaterialsOk = true;
                for (OrderItem item : order.getItems()) {
                    if (item.getRequiredMaterials() == null || item.getRequiredMaterials().isEmpty()) continue;
                    BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(
                            item.getProductId(), item.getQuantity(), organizationId);
                    if (!bom.isSufficient()) {
                        allMaterialsOk = false;
                        break;
                    }
                }
                if (allMaterialsOk) {
                    order.setStatus(ClientOrderStatus.READY_FOR_CONFIRMATION);
                    order.setOverallMaterialsSufficient(true);
                    order.setUpdatedAt(LocalDateTime.now());
                    order.setUpdatedBy(updatedBy);
                    ordersRepository.save(order);

                    notificationService.createNotification(order.getClientId(), "Order Unblocked",
                            "Your order " + order.getOrderReference() + " is now ready for confirmation — materials are available.",
                            NotificationType.ORDER, "/client-orders/" + order.getId());

                    userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.ADMIN).forEach(admin ->
                            notificationService.createNotification(admin.getId(), "Order Ready for Confirmation",
                                    "Order " + order.getOrderReference() + " unblocked — materials now sufficient.",
                                    NotificationType.ORDER, "/orders"));
                }
            } catch (Exception ignored) {
                
            }
        }
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

    private MaterialStock findExistingStock(String referenceCode, String name, String unit, String orgId) {
        if (referenceCode != null && !referenceCode.isBlank()) {
            Optional<MaterialStock> byRef = materialStockRepository.findByReferenceCodeAndOrganizationId(referenceCode, orgId);
            if (byRef.isPresent()) return byRef.get();
        }
        if (name != null && !name.isBlank() && unit != null && !unit.isBlank()) {
            List<MaterialStock> byName = materialStockRepository.findByNameIgnoreCaseAndUnitIgnoreCaseAndOrganizationId(name, unit, orgId);
            if (!byName.isEmpty()) return byName.get(0);
        }
        return null;
    }

    private void relinkBomItems(MaterialStock stock) {
        if (stock.getReferenceCode() == null && stock.getName() == null) return;
        List<MaterialSheetItem> broken = materialSheetItemRepository.findAll().stream()
                .filter(i -> {
                    if (i.getMaterialId() != null && materialStockRepository.existsById(i.getMaterialId())) return false;
                    if (stock.getReferenceCode() != null && stock.getReferenceCode().equalsIgnoreCase(i.getReferenceCode())) return true;
                    if (stock.getName() != null && stock.getName().equalsIgnoreCase(i.getMaterialName())) return true;
                    return false;
                })
                .toList();
        if (!broken.isEmpty()) {
            broken.forEach(i -> {
                i.setMaterialId(stock.getId());
                if (i.getReferenceCode() == null) i.setReferenceCode(stock.getReferenceCode());
            });
            materialSheetItemRepository.saveAll(broken);
            log.info("RELINK: updated {} BOM items to materialId={} ({})", broken.size(), stock.getId(), stock.getName());
        }
    }

    public RepairMaterialLinksResult repairMaterialLinks() {
        int relinked = 0;
        int stillBroken = 0;

        List<MaterialSheetItem> allItems = materialSheetItemRepository.findAll();
        for (MaterialSheetItem item : allItems) {
            boolean idValid = item.getMaterialId() != null && materialStockRepository.existsById(item.getMaterialId());
            if (idValid) continue;

            MaterialStock found = null;
            if (item.getReferenceCode() != null && !item.getReferenceCode().isBlank()) {

                List<MaterialStock> all = materialStockRepository.findAll();
                found = all.stream()
                        .filter(s -> item.getReferenceCode().equalsIgnoreCase(s.getReferenceCode()))
                        .findFirst().orElse(null);
            }
            if (found == null && item.getMaterialName() != null && !item.getMaterialName().isBlank()) {
                List<MaterialStock> all = materialStockRepository.findAll();
                found = all.stream()
                        .filter(s -> item.getMaterialName().equalsIgnoreCase(s.getName()))
                        .findFirst().orElse(null);
            }

            if (found != null) {
                log.info("REPAIR LINK: BOM item id={} materialName={} → new stockId={}",
                        item.getId(), item.getMaterialName(), found.getId());
                item.setMaterialId(found.getId());
                if (item.getReferenceCode() == null) item.setReferenceCode(found.getReferenceCode());
                materialSheetItemRepository.save(item);
                relinked++;
            } else {
                log.warn("REPAIR LINK: BOM item id={} materialName={} — no matching stock found",
                        item.getId(), item.getMaterialName());
                stillBroken++;
            }
        }
        log.info("REPAIR MATERIAL LINKS complete — relinked={}, stillBroken={}", relinked, stillBroken);
        return new RepairMaterialLinksResult(relinked, stillBroken);
    }

    public record RepairMaterialLinksResult(int relinked, int stillBroken) {}

    private void triggerAutoPurchaseOrderIfNeeded(MaterialStock stock) {
        if (stock.getMinimumThreshold() == null || stock.getQuantity() == null) return;
        if (stock.getQuantity() <= stock.getMinimumThreshold()) {
            String msg = "Material '" + stock.getName() + "' dropped to " + stock.getQuantity()
                + " " + stock.getUnit() + " (min: " + stock.getMinimumThreshold() + "). Please restock via Supply Chain.";
            userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.ADMIN).forEach(admin ->
                notificationService.createNotification(admin.getId(), "Low Stock — Restock Needed",
                    msg, com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                    "/supply-chain")
            );
            adminAlertService.checkAndAlertLowStock(stock);
        }
    }

    public record MaterialConsumptionDTO(String materialStockId, int quantity) {}
}
