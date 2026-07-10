package com.dppsmart.dppsmart.Production.Services;

import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Notification.Services.RealtimeEventService;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderItemStatus;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.DTO.CreateProductionDto;
import com.dppsmart.dppsmart.Production.DTO.ProductionMaterialConsumptionDto;
import com.dppsmart.dppsmart.Production.DTO.ProductionResponseDto;
import com.dppsmart.dppsmart.Production.DTO.UpdateProductionDto;
import com.dppsmart.dppsmart.Production.DTO.UpdateProductionStatusDto;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Production.Mapper.ProductionMapper;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.ProductStock.Services.ProductStockService;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProductionService {

    @Autowired private ProductionRepository productionRepository;
    @Autowired private ProductionMapper productionMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private PermissionService permissionService;
    @Autowired private AuditService auditService;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductStockService productStockService;
    @Autowired private ProductStockRepository productStockRepository;
    @Autowired private NotificationServiceImpl notificationService;
    @Autowired private StockMovementService stockMovementService;
    @Autowired private OrdersRepository ordersRepository;
    @Autowired private MaterialStockRepository materialStockRepository;
    @Autowired private TechnicalSheetRepository technicalSheetRepository;
    @Autowired private MaterialSheetItemRepository materialSheetItemRepository;
    @Autowired private RealtimeEventService realtimeEventService;
    @Autowired private SecurityAnalysisService securityAnalysisService;
    @Autowired private RuleDetectionService ruleDetectionService;
    @Autowired private OperationSheetItemRepository operationSheetItemRepository;
    @Autowired private OperationRepository operationRepository;

    public ProductionResponseDto create(CreateProductionDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to create productions");
        }
        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        List<ProductionStep> steps = generateStepsFromOperationSheet(
                dto.getProductId(), dto.getQuantity(), dto.getSteps());

        Production production = Production.builder()
                .productId(dto.getProductId())
                .organizationId(organization.getId())
                .quantity(dto.getQuantity())
                .steps(steps)
                .clientOrderId(dto.getClientOrderId())
                .status(ProductionStatus.PLANNED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Production saved = productionRepository.save(production);

        var prodAlert = ruleDetectionService.detectProductionAnomaly(
                saved.getId(), saved.getProductId(), saved.getQuantity(),
                false, saved.getOrganizationId(), user.getEmail());
        if (prodAlert != null) {
            securityAnalysisService.analyzeAndAlert(prodAlert);
        }

        auditService.log("Production", saved.getId(), "CREATE", saved.getOrganizationId(), null,
                "Production created for product " + saved.getProductId());
        notificationService.createNotification(user.getId(), "Production Batch Created",
                "New production batch created for " + saved.getProductId(),
                NotificationType.PRODUCTION, "/production/" + saved.getId());
        return productionMapper.toDto(saved);
    }

    public List<ProductionResponseDto> getAll() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to access productions");
        }
        return productionRepository.findAll().stream()
                .filter(p -> p != null && permissionService.canAccessOrganization(user, p.getOrganizationId()))
                .map(productionMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<ProductionResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to access productions");
        }
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("Access denied");
        }
        return productionRepository.findByOrganizationId(organizationId).stream()
                .map(productionMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<ProductionResponseDto> getByOrderId(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to access productions");
        }
        return productionRepository.findByClientOrderId(orderId).stream()
                .filter(p -> p != null && permissionService.canAccessOrganization(user, p.getOrganizationId()))
                .map(productionMapper::toDto)
                .collect(Collectors.toList());
    }

    public ProductionResponseDto updateStatus(String id, UpdateProductionStatusDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update productions");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }

        if (production.getStatus() == ProductionStatus.COMPLETED) {
            throw new BadRequestException("Production is already completed");
        }
        if (production.getStatus() == ProductionStatus.CANCELLED) {
            throw new BadRequestException("Cannot update a cancelled production");
        }

        if (dto.getStatus() == ProductionStatus.COMPLETED) {
            return completeProductionBatch(id);
        }

        production.setStatus(dto.getStatus());
        production.setUpdatedAt(LocalDateTime.now());

        Production saved = productionRepository.save(production);

        if (saved.getStatus() == ProductionStatus.CANCELLED) {
            var cancelAlert = ruleDetectionService.detectProductionAnomaly(
                    saved.getId(), saved.getProductId(), saved.getQuantity(),
                    true, saved.getOrganizationId(), user.getEmail());
            if (cancelAlert != null) {
                securityAnalysisService.analyzeAndAlert(cancelAlert);
            }
        }

        auditService.log("Production", saved.getId(), "STATUS_CHANGE", saved.getOrganizationId(), null,
                "Status changed to " + saved.getStatus());
        notificationService.createNotification(user.getId(), "Production Status Updated",
                "Batch " + saved.getId() + " is now " + saved.getStatus(),
                NotificationType.PRODUCTION, "/production/" + saved.getId());
        return productionMapper.toDto(saved);
    }

    public ProductionResponseDto completeProductionBatch(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }
        if (production.getStatus() == ProductionStatus.COMPLETED) {
            throw new BadRequestException("Production is already completed");
        }
        if (production.getStatus() == ProductionStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a cancelled production");
        }

        production.setStatus(ProductionStatus.COMPLETED);
        production.setCompletedAt(LocalDateTime.now());
        production.setUpdatedAt(LocalDateTime.now());
        Production saved = productionRepository.save(production);

        onProductionCompleted(saved, user);
        return productionMapper.toDto(saved);
    }

    public ProductionMaterialConsumptionDto getMaterialConsumption(String productionId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Production production = getProduction(productionId);

        String productName = productRepository.findById(production.getProductId())
                .map(p -> p.getProductName()).orElse(production.getProductId());

        Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(production.getProductId(), TechnicalSheetType.MATERIAL_SHEET, TechnicalSheetStatus.ACTIVE);

        if (sheetOpt.isEmpty()) {
            return ProductionMaterialConsumptionDto.builder()
                    .productionId(productionId)
                    .productId(production.getProductId())
                    .productName(productName)
                    .quantityToProduce(production.getQuantity())
                    .technicalSheetFound(false)
                    .allMaterialsSufficient(false)
                    .materials(List.of())
                    .build();
        }

        TechnicalSheet sheet = sheetOpt.get();
        List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());

        List<ProductionMaterialConsumptionDto.MaterialConsumptionLine> lines = new ArrayList<>();
        boolean allSufficient = true;

        for (MaterialSheetItem si : sheetItems) {
            if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;

            double totalNeeded = round2(si.getQuantityPerUnit() * production.getQuantity());
            MaterialStock ms = materialStockRepository.findById(si.getMaterialId()).orElse(null);
            int currentStock = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
            int reserved = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            String refCode = ms != null ? ms.getReferenceCode() : null;
            double remaining = round2(currentStock - totalNeeded);
            double shortage = round2(Math.max(0, totalNeeded - currentStock));

            String status;
            if (shortage > 0) {
                status = "NOT_ENOUGH";
                allSufficient = false;
            } else if (remaining >= 0 && remaining < currentStock * 0.2) {
                status = "LOW_AFTER_PRODUCTION";
            } else {
                status = "ENOUGH";
            }

            lines.add(ProductionMaterialConsumptionDto.MaterialConsumptionLine.builder()
                    .materialId(si.getMaterialId())
                    .materialName(si.getMaterialName() != null ? si.getMaterialName() : si.getMaterialId())
                    .referenceCode(refCode)
                    .unit(si.getUnit() != null ? si.getUnit() : "")
                    .quantityPerUnit(si.getQuantityPerUnit())
                    .totalNeeded(totalNeeded)
                    .currentStock(currentStock)
                    .reservedQuantity(reserved)
                    .remainingAfterProduction(remaining)
                    .shortage(shortage)
                    .status(status)
                    .build());
        }

        return ProductionMaterialConsumptionDto.builder()
                .productionId(productionId)
                .productId(production.getProductId())
                .productName(productName)
                .quantityToProduce(production.getQuantity())
                .technicalSheetFound(true)
                .technicalSheetId(sheet.getId())
                .technicalSheetName(sheet.getName())
                .allMaterialsSufficient(allSufficient)
                .materials(lines)
                .build();
    }

    public ProductionResponseDto startStep(String productionId, int stepIndex) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) throw new ForbiddenException("Access denied");
        Production production = getProduction(productionId);

        if (user.getRole() == Roles.EMPLOYEE) {
            ProductionStep step = production.getSteps().get(stepIndex);
            if (!user.getId().equals(step.getAssignedEmployeeId()))
                throw new ForbiddenException("You can only start steps assigned to you");
        } else if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }

        ProductionStep step = production.getSteps().get(stepIndex);
        step.setStartDate(LocalDateTime.now());
        step.setStartedAt(LocalDateTime.now());
        step.setCompleted(false);
        production.setStatus(ProductionStatus.IN_PROGRESS);
        production.setUpdatedAt(LocalDateTime.now());
        return productionMapper.toDto(productionRepository.save(production));
    }

    public ProductionResponseDto completeStep(String productionId, int stepIndex) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) throw new ForbiddenException("Access denied");
        Production production = getProduction(productionId);

        if (user.getRole() == Roles.EMPLOYEE) {
            ProductionStep target = production.getSteps().get(stepIndex);
            if (!user.getId().equals(target.getAssignedEmployeeId()))
                throw new ForbiddenException("You can only complete steps assigned to you");
        } else if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }

        ProductionStep step = production.getSteps().get(stepIndex);
        step.setEndDate(LocalDateTime.now());
        step.setCompleted(true);

        boolean allDone = production.getSteps().stream()
                .allMatch(s -> Boolean.TRUE.equals(s.getCompleted()));

        production.setStatus(allDone ? ProductionStatus.COMPLETED : ProductionStatus.IN_PROGRESS);
        production.setUpdatedAt(LocalDateTime.now());
        if (allDone) production.setCompletedAt(LocalDateTime.now());

        Production saved = productionRepository.save(production);

        if (allDone) {
            onProductionCompleted(saved, user);
        }

        return productionMapper.toDto(saved);
    }

    private void onProductionCompleted(Production production, User user) {
        Product product = productRepository.findById(production.getProductId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + production.getProductId()));

        if (!production.isMaterialsConsumed()) {
            consumeMaterialsFromBom(production, user, product);
            production.setMaterialsConsumed(true);
            productionRepository.save(production);
        } else {
            log.info("Materials already consumed for production {} (skipped double consumption)", production.getId());
        }

        Optional<ProductStock> existingStock = productStockRepository
                .findByProductId(product.getId()).stream().findFirst();
        int before = existingStock.map(s -> s.getQuantity() != null ? s.getQuantity() : 0).orElse(0);

        productStockService.addFromProduction(
                product.getProductName(), product.getId(),
                production.getQuantity(), "units", production.getOrganizationId(),
                production.getId());

        int newQty = before + production.getQuantity();
        stockMovementService.recordProductMovement(
                MovementType.PRODUCT_PRODUCED, product.getId(), product.getProductName(),
                "units", production.getQuantity(), before, newQty,
                production.getClientOrderId(), production.getId(),
                production.getOrganizationId(), user.getEmail());

        realtimeEventService.broadcastProductStockUpdated(product.getId(), newQty, production.getOrganizationId());

        auditService.log("Production", production.getId(), "COMPLETED", production.getOrganizationId(), null,
                "Produced " + production.getQuantity() + " units of " + product.getProductName());

        realtimeEventService.broadcastProductionCompleted(
                production.getId(), production.getClientOrderId(),
                production.getProductId(), production.getQuantity());

        if (production.getClientOrderId() != null) {
            ordersRepository.findById(production.getClientOrderId()).ifPresent(order -> {
                for (OrderItem item : order.getItems()) {
                    if (production.getId().equals(item.getRelatedProductionId())) {
                        item.setStatus(OrderItemStatus.PRODUCED);
                    }
                }

                List<String> allProdIds = order.getRelatedProductionIds() != null
                        ? order.getRelatedProductionIds() : List.of(production.getId());
                boolean allDone = allProdIds.stream()
                        .map(pid -> productionRepository.findById(pid).orElse(null))
                        .filter(Objects::nonNull)
                        .allMatch(p -> p.getStatus() == ProductionStatus.COMPLETED);

                if (allDone) {
                    for (OrderItem item : order.getItems()) {
                        if (item.getStatus() == OrderItemStatus.IN_PRODUCTION
                                || item.getStatus() == OrderItemStatus.PRODUCED) {
                            productStockRepository.findByProductId(item.getProductId()).stream().findFirst()
                                    .ifPresent(ps -> {
                                        int stockBefore = ps.getQuantity() != null ? ps.getQuantity() : 0;
                                        int toDeduct = Math.min(item.getQuantity(), stockBefore);
                                        if (toDeduct > 0) {
                                            ps.setQuantity(stockBefore - toDeduct);
                                            ps.setLastUpdatedBy(user.getEmail());
                                            ps.setUpdatedAt(LocalDateTime.now());
                                            productStockRepository.save(ps);
                                            stockMovementService.recordProductMovement(
                                                    MovementType.PRODUCT_DECREASED,
                                                    item.getProductId(), item.getProductName(), item.getUnit(),
                                                    toDeduct, stockBefore, stockBefore - toDeduct,
                                                    order.getId(), production.getId(),
                                                    order.getOrganizationId(), user.getEmail());
                                            realtimeEventService.broadcastProductStockUpdated(
                                                    item.getProductId(), stockBefore - toDeduct, order.getOrganizationId());
                                        }
                                    });
                            item.setStatus(OrderItemStatus.READY_FOR_DELIVERY);
                        }
                    }

                    order.setStatus(ClientOrderStatus.READY_FOR_DELIVERY);
                    order.setProductionCompletedAt(LocalDateTime.now());
                    order.setDeliveryReadyAt(LocalDateTime.now());
                    order.setUpdatedAt(LocalDateTime.now());
                    ordersRepository.save(order);

                    notificationService.createNotification(order.getClientId(), "Production Completed",
                            "Your order " + order.getOrderReference() + " production is complete and ready for delivery!",
                            NotificationType.ORDER, "/client-orders/" + order.getId());
                    realtimeEventService.broadcastOrderStatusChanged(
                            order.getId(), order.getStatus().name(),
                            com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper.toDto(order));
                } else {
                    order.setUpdatedAt(LocalDateTime.now());
                    ordersRepository.save(order);
                    realtimeEventService.broadcastOrderStatusChanged(
                            order.getId(), order.getStatus().name(),
                            com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper.toDto(order));
                }
            });
        }

        notificationService.createNotification(user.getId(), "Production Completed",
                production.getQuantity() + " units of " + product.getProductName() + " added to stock",
                NotificationType.PRODUCTION, "/production/" + production.getId());
    }

    private void consumeMaterialsFromBom(Production production, User user, Product product) {
        technicalSheetRepository.findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(production.getProductId(), TechnicalSheetType.MATERIAL_SHEET, TechnicalSheetStatus.ACTIVE)
                .ifPresentOrElse(sheet -> {
                    List<MaterialSheetItem> items = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                    StringBuilder auditDetails = new StringBuilder("Materials consumed: ");
                    for (MaterialSheetItem si : items) {
                        if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                        int toConsume = (int) Math.ceil(si.getQuantityPerUnit() * production.getQuantity());
                        materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                            int before = ms.getQuantity() != null ? ms.getQuantity() : 0;

                            log.info("CONSUME MATERIAL (from completion) — material={}, physical={}, requested={}",
                                    ms.getName(), before, toConsume);

                            if (toConsume <= 0) return;
                            if (toConsume > before) {
                                log.warn("CONSUME FAILED (completion) — insufficient stock for {}: need {}, have {}",
                                        ms.getName(), toConsume, before);
                                return;
                            }

                            int newQty = before - toConsume;

                            ms.setQuantity(newQty);
                            ms.setLastUpdatedBy(user.getEmail());
                            ms.setUpdatedAt(LocalDateTime.now());
                            materialStockRepository.save(ms);

                            log.info("CONSUME OK (completion) — material={}, beforeQty={}, afterQty={}",
                                    ms.getName(), before, newQty);

                            stockMovementService.recordMaterialMovement(
                                    MovementType.MATERIAL_CONSUMED_FOR_PRODUCTION,
                                    ms.getId(), ms.getName(), ms.getUnit(),
                                    toConsume, before, newQty,
                                    production.getClientOrderId(), production.getId(),
                                    production.getOrganizationId(), user.getEmail());

                            realtimeEventService.broadcastMaterialStockUpdated(
                                    ms.getId(), newQty, production.getOrganizationId());
                        });
                        auditDetails.append(si.getMaterialName()).append(" x").append(toConsume).append(", ");
                    }
                    auditService.log("Production", production.getId(), "MATERIALS_CONSUMED",
                            production.getOrganizationId(), null, auditDetails.toString());
                }, () -> log.warn("No active technical sheet for product {} — materials not consumed during production completion",
                        production.getProductId()));
    }

    public List<ProductionResponseDto> getMyAssignments() {
        User user = getCurrentUser();
        return productionRepository.findAll().stream()
                .filter(p -> p.getSteps() != null && p.getSteps().stream()
                        .anyMatch(s -> user.getId().equals(s.getAssignedEmployeeId())))
                .map(productionMapper::toDto)
                .toList();
    }

    public ProductionResponseDto assignStep(String productionId, int stepIndex, String employeeId, String employeeName) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) throw new ForbiddenException("Access denied");
        Production production = getProduction(productionId);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) throw new ForbiddenException("Access denied");
        ProductionStep step = production.getSteps().get(stepIndex);
        step.setOperator(employeeName != null ? employeeName : employeeId);
        step.setAssignedEmployeeId(employeeId);
        step.setAssignedAt(LocalDateTime.now());
        production.setUpdatedAt(LocalDateTime.now());
        return productionMapper.toDto(productionRepository.save(production));
    }

    public ProductionResponseDto update(String id, UpdateProductionDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }
        if (production.getStatus() == ProductionStatus.COMPLETED) {
            throw new BadRequestException("Cannot update a completed production");
        }
        if (production.getStatus() == ProductionStatus.CANCELLED) {
            throw new BadRequestException("Cannot update a cancelled production");
        }

        if (dto.getProductId() != null) production.setProductId(dto.getProductId());
        if (dto.getQuantity() != null) {
            production.setQuantity(dto.getQuantity());
            List<ProductionStep> recalculated = generateStepsFromOperationSheet(
                    production.getProductId(), dto.getQuantity(), dto.getSteps());
            production.setSteps(recalculated);
        } else if (dto.getSteps() != null) {
            for (int i = 0; i < dto.getSteps().size(); i++) {
                dto.getSteps().get(i).setOrderIndex(i);
            }
            production.setSteps(dto.getSteps());
        }
        if (dto.getEstimatedEndDate() != null) production.setEstimatedEndDate(dto.getEstimatedEndDate());
        if (dto.getAssignedTo() != null) production.setAssignedTo(dto.getAssignedTo());
        if (dto.getPriority() != null) production.setPriority(dto.getPriority());

        production.setUpdatedAt(LocalDateTime.now());
        Production saved = productionRepository.save(production);

        auditService.log("Production", saved.getId(), "UPDATE", saved.getOrganizationId(), null,
                "Production updated");
        notificationService.createNotification(user.getId(), "Production Updated",
                "Production batch " + saved.getId() + " has been updated",
                NotificationType.PRODUCTION, "/production/" + saved.getId());
        return productionMapper.toDto(saved);
    }

    public void delete(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }
        productionRepository.deleteById(id);
        auditService.log("Production", id, "DELETE", production.getOrganizationId(), null, "Production deleted");
    }

    private List<ProductionStep> generateStepsFromOperationSheet(String productId, int quantity, List<ProductionStep> fallbackSteps) {
        Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(productId, TechnicalSheetType.OPERATION_SHEET, TechnicalSheetStatus.ACTIVE);
        if (sheetOpt.isEmpty()) {
            if (fallbackSteps != null && !fallbackSteps.isEmpty()) {
                for (int i = 0; i < fallbackSteps.size(); i++) {
                    fallbackSteps.get(i).setOrderIndex(i);
                }
                return fallbackSteps;
            }
            throw new BadRequestException(
                    "No active technical sheet found for product. "
                    + "Please create and activate a technical sheet with operation items first.");
        }

        TechnicalSheet sheet = sheetOpt.get();
        List<OperationSheetItem> opItems = operationSheetItemRepository
                .findByTechnicalSheetIdOrderByStepOrderAsc(sheet.getId());

        if (opItems.isEmpty()) {
            if (fallbackSteps != null && !fallbackSteps.isEmpty()) {
                for (int i = 0; i < fallbackSteps.size(); i++) {
                    fallbackSteps.get(i).setOrderIndex(i);
                }
                return fallbackSteps;
            }
            throw new BadRequestException(
                    "No operation items found in the active technical sheet. "
                    + "Please add operations to the sheet first.");
        }

        Map<String, Operation> opMap = operationRepository.findAllById(
                opItems.stream().map(OperationSheetItem::getOperationId).distinct().toList()
        ).stream().collect(Collectors.toMap(Operation::getId, Function.identity()));

        List<ProductionStep> generated = new ArrayList<>();
        for (int i = 0; i < opItems.size(); i++) {
            OperationSheetItem oi = opItems.get(i);
            Operation op = opMap.get(oi.getOperationId());
            Double durPerUnit = oi.getDurationEstimate() != null
                    ? oi.getDurationEstimate()
                    : (op != null ? op.getDefaultDuration() : null);
            String durUnit = op != null && op.getDurationUnit() != null
                    ? op.getDurationUnit() : "MINUTES";
            Double costPerMinute = op != null && op.getCostPerMinute() != null ? op.getCostPerMinute() : 0.0;

            double totalDur = durPerUnit != null ? durPerUnit * quantity : 0;
            double costPerUnitVal = (durPerUnit != null ? durPerUnit : 0) * (costPerMinute != null ? costPerMinute : 0);
            double totalCost = costPerUnitVal * quantity;

            ProductionStep step = ProductionStep.builder()
                    .stepName(oi.getOperationName() != null ? oi.getOperationName() : "Step " + (i + 1))
                    .description("")
                    .completed(false)
                    .orderIndex(i)
                    .operationId(oi.getOperationId())
                    .operationName(oi.getOperationName())
                    .instructions(oi.getInstructions())
                    .durationPerUnit(durPerUnit)
                    .durationUnit(durUnit)
                    .orderQuantity(quantity)
                    .totalDuration(totalDur)
                    .executionCostPerUnit(costPerUnitVal)
                    .totalExecutionCost(totalCost)
                    .build();
            generated.add(step);
        }
        return generated;
    }

    private Production getProduction(String id) {
        return productionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Production not found"));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
