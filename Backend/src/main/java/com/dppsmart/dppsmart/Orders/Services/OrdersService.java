package com.dppsmart.dppsmart.Orders.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Email.Services.EmailService;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.MaterialStock.Services.MaterialStockService;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.SupplierRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.DTO.OrderProcessResultDTO.MissingMaterialLine;
import com.dppsmart.dppsmart.Orders.Entities.*;
import com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.ProductStock.Services.ProductStockService;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomCalculationResultDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomMaterialLineDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrdersService {

    private final OrdersRepository ordersRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TechnicalSheetModuleService technicalSheetModuleService;
    private final ProductionRepository productionRepository;
    private final StockMovementService stockMovementService;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final EmailService emailService;
    private final MaterialStockService materialStockService;
    private final ProductStockService productStockService;
    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final SupplierRepository supplierRepository;
    private final SecurityAnalysisService securityAnalysisService;
    private final RuleDetectionService ruleDetectionService;



    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto create(CreateOrderDto dto) {
        User user = getCurrentUser();

        String resolvedOrgId;
        if (user.getRole() == Roles.CLIENT) {
            
            resolvedOrgId = user.getOrganizationId() != null ? user.getOrganizationId()
                    : (user.getAssignedOrganizationIds() != null && !user.getAssignedOrganizationIds().isEmpty()
                    ? user.getAssignedOrganizationIds().get(0) : null);
            if (resolvedOrgId == null) {
                resolvedOrgId = organizationRepository.findAll().stream()
                        .findFirst()
                        .map(org -> org.getId())
                        .orElseThrow(() -> new BadRequestException("No organization exists in the system yet."));
            }
        } else {
            resolvedOrgId = dto.getOrganizationId();
            if (resolvedOrgId == null || resolvedOrgId.isBlank()) {
                throw new BadRequestException("organizationId is required");
            }
            if (!organizationRepository.existsById(resolvedOrgId)) {
                throw new NotFoundException("Organization not found");
            }
            if (!permissionService.canAccessOrganization(user, resolvedOrgId)) {
                throw new ForbiddenException("You are not allowed to use this organization");
            }
        }

        List<OrderItem> items = new ArrayList<>();
        int totalQty = 0;
        boolean overallMaterialsSufficient = true;
        ClientOrderStatus derivedStatus = ClientOrderStatus.PENDING_REVIEW;

        for (OrderItemDto itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + itemDto.getProductId()));

            
            Optional<ProductStock> stockOpt = productStockRepository
                    .findByProductId(itemDto.getProductId()).stream().findFirst();
            int available = stockOpt.map(s -> s.getQuantity() != null ? s.getQuantity() : 0).orElse(0);

            OrderItemStatus itemStatus;
            if (available >= itemDto.getQuantity()) {
                itemStatus = OrderItemStatus.AVAILABLE;
            } else if (available > 0) {
                itemStatus = OrderItemStatus.PARTIAL;
            } else {
                itemStatus = OrderItemStatus.OUT_OF_STOCK;
            }

            
            BomCalculationResultDto bom = null;
            String technicalSheetId = null;
            Integer technicalSheetVersion = null;
            List<BomMaterialLineDto> requiredMaterials = Collections.emptyList();
            boolean itemMaterialsAvailable = true;

            try {
                bom = technicalSheetModuleService.calculateBom(
                        itemDto.getProductId(), itemDto.getQuantity(), resolvedOrgId);
                technicalSheetId = bom.getTechnicalSheetId();
                technicalSheetVersion = bom.getVersion();
                requiredMaterials = bom.getMaterials();
                itemMaterialsAvailable = bom.isSufficient();
                if (!itemMaterialsAvailable) {
                    overallMaterialsSufficient = false;
                    if (itemStatus == OrderItemStatus.OUT_OF_STOCK || itemStatus == OrderItemStatus.PARTIAL) {
                        itemStatus = OrderItemStatus.TO_PRODUCE;
                    }
                }
            } catch (NotFoundException e) {
                itemMaterialsAvailable = false;
            }

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setProductName(product.getProductName());
            item.setQuantity(itemDto.getQuantity());
            item.setUnit(stockOpt.map(ProductStock::getUnit).orElse("units"));
            item.setAvailableStock(available);
            item.setStatus(itemStatus);
            item.setTechnicalSheetId(technicalSheetId);
            item.setTechnicalSheetVersion(technicalSheetVersion);
            item.setRequiredMaterials(requiredMaterials);
            item.setMaterialsAvailable(itemMaterialsAvailable);

            items.add(item);
            totalQty += itemDto.getQuantity();
        }

        derivedStatus = ClientOrderStatus.PENDING_REVIEW;

        Orders order = new Orders();
        order.setId(NanoIdUtils.randomNanoId());
        order.setOrderReference(generateOrderReference());
        order.setClientId(user.getId());
        order.setOrganizationId(resolvedOrgId);
        order.setItems(items);
        order.setRequestedDeliveryDate(dto.getRequestedDeliveryDate());
        order.setStatus(derivedStatus);
        order.setTotalQuantity(totalQty);
        order.setOverallMaterialsSufficient(overallMaterialsSufficient);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setCreatedBy(user.getEmail());
        order.setUpdatedBy(user.getEmail());

        Orders saved = ordersRepository.save(order);

        var orderAlert = ruleDetectionService.detectOrderAnomaly(
                saved.getId(), totalQty, false, "Order",
                resolvedOrgId, user.getEmail());
        if (orderAlert != null) {
            securityAnalysisService.analyzeAndAlert(orderAlert);
        }

        auditService.log("Order", saved.getId(), "CREATE", saved.getOrganizationId(), null,
                "Order created: " + saved.getOrderReference() + " [" + saved.getStatus() + "]");

        notificationService.createNotification(user.getId(), "Order Submitted",
                "Order " + saved.getOrderReference() + " submitted — status: " + saved.getStatus(),
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        notifyAdmins(resolvedOrgId, "New Client Order",
                "Order " + saved.getOrderReference() + " needs review. Status: " + saved.getStatus(),
                "/admin/orders/" + saved.getId());

        
        List<String> productLines = saved.getItems().stream()
                .map(i -> i.getProductName() + " × " + i.getQuantity())
                .collect(Collectors.toList());
        emailService.sendOrderSubmittedToClient(
                user.getEmail(),
                saved.getOrderReference(),
                user.getName() != null ? user.getName() : user.getEmail(),
                dto.getRequestedDeliveryDate() != null ? dto.getRequestedDeliveryDate().toString() : "—",
                productLines
        );

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderProcessResultDTO processOrder(String orderId, AdminConfirmOrderDto dto) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        Set<ClientOrderStatus> allowedStatuses = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.DATE_CHANGE_REQUESTED,
                ClientOrderStatus.CONFIRMED
        );
        if (!allowedStatuses.contains(order.getStatus())) {
            throw new BadRequestException("Order cannot be processed in status: " + order.getStatus());
        }

        if (dto.getConfirmedDeliveryDate() != null) {
            order.setConfirmedDeliveryDate(dto.getConfirmedDeliveryDate());
        }

        record ItemPlan(OrderItem item, int fromStock, int toProduce) {}
        List<ItemPlan> plans = new ArrayList<>();
        boolean allFromStock = true;

        for (OrderItem item : order.getItems()) {
            int stock = productStockRepository.findByProductId(item.getProductId())
                    .stream().findFirst()
                    .map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0)
                    .orElse(0);
            int fromStock = Math.min(item.getQuantity(), stock);
            int toProduce = item.getQuantity() - fromStock;
            if (toProduce > 0) allFromStock = false;
            plans.add(new ItemPlan(item, fromStock, toProduce));
        }

        if (allFromStock) {
            for (ItemPlan plan : plans) {
                productStockRepository.findByProductId(plan.item().getProductId()).stream().findFirst()
                        .ifPresent(ps -> {
                            int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
                            int toDeduct = plan.item().getQuantity();

                            if (toDeduct <= 0) return;
                            if (toDeduct > before) {
                                log.warn("DEDUCT FAILED (OrdersService) — insufficient {}: need {}, have {}",
                                        plan.item().getProductName(), toDeduct, before);
                                throw new BadRequestException("Insufficient stock for " + plan.item().getProductName());
                            }

                            int newQty = before - toDeduct;
                            ps.setQuantity(newQty);
                            ps.setLastUpdatedBy(user.getEmail());
                            ps.setUpdatedAt(LocalDateTime.now());
                            productStockRepository.save(ps);

                            stockMovementService.recordProductMovement(
                                    MovementType.PRODUCT_DECREASED, plan.item().getProductId(),
                                    plan.item().getProductName(), plan.item().getUnit(),
                                    toDeduct, before, newQty,
                                    order.getId(), null, order.getOrganizationId(), user.getEmail());
                        });
            }

            order.setStatus(ClientOrderStatus.READY);
            order.setDeliveryToken(NanoIdUtils.randomNanoId());
            order.setUpdatedAt(LocalDateTime.now());
            order.setUpdatedBy(user.getEmail());
            Orders saved = ordersRepository.save(order);

            auditService.log("Order", saved.getId(), "PROCESS_DELIVERED", saved.getOrganizationId(), null,
                    "Order processed → fully from stock, ready for delivery: " + saved.getOrderReference());
            notificationService.createNotification(saved.getClientId(), "Order Ready for Delivery",
                    "Your order " + saved.getOrderReference() + " is ready — all items in stock!",
                    NotificationType.ORDER, "/client-orders/" + saved.getId());

            User client = userRepository.findById(saved.getClientId()).orElse(null);
            if (client != null) {
                emailService.sendOrderReadyToClient(client.getEmail(), saved.getOrderReference(),
                        client.getName() != null ? client.getName() : client.getEmail(),
                        saved.getConfirmedDeliveryDate() != null ? saved.getConfirmedDeliveryDate().toString() : "");
            }

            return OrderProcessResultDTO.builder()
                    .orderId(saved.getId())
                    .orderReference(saved.getOrderReference())
                    .outcome(OrderProcessResultDTO.Outcome.DELIVERED)
                    .deliveryToken(saved.getDeliveryToken())
                    .message("All items available in stock. Order is ready for delivery.")
                    .build();
        }

        Map<String, Double> materialNeeds = new LinkedHashMap<>();
        Map<String, String> materialNames = new LinkedHashMap<>();
        Map<String, String> materialUnits = new LinkedHashMap<>();

        for (ItemPlan plan : plans) {
            if (plan.toProduce() <= 0) continue;
            final int toProduce = plan.toProduce();
            technicalSheetRepository.findByProductIdAndStatus(
                    plan.item().getProductId(), TechnicalSheetStatus.ACTIVE)
                    .ifPresent(sheet -> {
                        List<MaterialSheetItem> sheetItems =
                                materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                        for (MaterialSheetItem si : sheetItems) {
                            double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                            double needed = qpu * toProduce;
                            if (needed <= 0) continue;
                            materialNeeds.merge(si.getMaterialId(), needed, Double::sum);
                            materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                                materialNames.put(ms.getId(), ms.getName());
                                materialUnits.put(ms.getId(), ms.getUnit() != null ? ms.getUnit() : "");
                            });
                        }
                    });
        }

        List<MissingMaterialLine> missingLines = new ArrayList<>();
        boolean allMaterialsAvailable = true;

        for (Map.Entry<String, Double> entry : materialNeeds.entrySet()) {
            String matId = entry.getKey();
            double required = entry.getValue();
            int avail = materialStockRepository.findById(matId)
                    .map(ms -> ms.getQuantity() != null ? ms.getQuantity() : 0).orElse(0);
            double missing = Math.max(0.0, required - avail);
            if (missing > 0) {
                allMaterialsAvailable = false;
                missingLines.add(MissingMaterialLine.builder()
                        .materialId(matId)
                        .materialName(materialNames.getOrDefault(matId, matId))
                        .unit(materialUnits.getOrDefault(matId, ""))
                        .requiredQuantity(Math.round(required * 100.0) / 100.0)
                        .availableQuantity(avail)
                        .missingQuantity(Math.round(missing * 100.0) / 100.0)
                        .build());
            }
        }

        if (allMaterialsAvailable) {
            List<String> productionIds = new ArrayList<>();

            for (ItemPlan plan : plans) {
                if (plan.fromStock() > 0) {
                    final int fromStockFinal = plan.fromStock();
                    productStockRepository.findByProductId(plan.item().getProductId()).stream().findFirst()
                            .ifPresent(ps -> {
                                int before = ps.getQuantity() != null ? ps.getQuantity() : 0;

                                if (fromStockFinal <= 0) return;
                                if (fromStockFinal > before) {
                                    log.warn("DEDUCT FAILED (OrdersService/allMats) — insufficient {}: need {}, have {}",
                                            plan.item().getProductName(), fromStockFinal, before);
                                    throw new BadRequestException("Insufficient stock for " + plan.item().getProductName());
                                }

                                int newQty = before - fromStockFinal;
                                ps.setQuantity(newQty);
                                ps.setLastUpdatedBy(user.getEmail());
                                ps.setUpdatedAt(LocalDateTime.now());
                                productStockRepository.save(ps);

                                stockMovementService.recordProductMovement(
                                        MovementType.PRODUCT_DECREASED, plan.item().getProductId(),
                                        plan.item().getProductName(), plan.item().getUnit(), fromStockFinal,
                                        before, newQty, order.getId(), null,
                                        order.getOrganizationId(), user.getEmail());
                            });
                }

                if (plan.toProduce() > 0) {
                    final int toProduceFinal = plan.toProduce();

                    technicalSheetRepository.findByProductIdAndStatus(
                            plan.item().getProductId(), TechnicalSheetStatus.ACTIVE)
                            .ifPresent(sheet -> {
                                List<MaterialSheetItem> sheetItems =
                                        materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                                for (MaterialSheetItem si : sheetItems) {
                                    double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                                    double needed = qpu * toProduceFinal;
                                    if (needed <= 0) continue;
                                    materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                                        int before = ms.getQuantity() != null ? ms.getQuantity() : 0;
                                        int toConsume = (int) Math.ceil(needed);
                                        if (toConsume <= 0 || toConsume > before) {
                                            log.warn("CONSUME SKIPPED — {} need={}, available={}", ms.getName(), toConsume, before);
                                            return;
                                        }
                                        ms.setQuantity(before - toConsume);
                                        ms.setLastUpdatedBy(user.getEmail());
                                        ms.setUpdatedAt(LocalDateTime.now());
                                        materialStockRepository.save(ms);
                                        stockMovementService.recordMaterialMovement(
                                                MovementType.MATERIAL_DECREASED, ms.getId(), ms.getName(),
                                                ms.getUnit(), toConsume, before, ms.getQuantity(),
                                                order.getId(), null, order.getOrganizationId(), user.getEmail());
                                    });
                                }
                            });

                    Production production = Production.builder()
                            .id(NanoIdUtils.randomNanoId())
                            .productId(plan.item().getProductId())
                            .organizationId(order.getOrganizationId())
                            .quantity(toProduceFinal)
                            .clientOrderId(order.getId())
                            .status(ProductionStatus.PLANNED)
                            .steps(Collections.emptyList())
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .materialsConsumed(true)
                            .build();
                    Production savedProduction = productionRepository.save(production);
                    productionIds.add(savedProduction.getId());

                    auditService.log("Production", savedProduction.getId(), "CREATE",
                            order.getOrganizationId(), null,
                            "Production of " + toProduceFinal + " × " + plan.item().getProductName()
                                    + " started for order " + order.getOrderReference());
                    notifyAdmins(order.getOrganizationId(), "Production Started",
                            toProduceFinal + " × " + plan.item().getProductName()
                                    + " queued for production (order " + order.getOrderReference() + ")",
                            "/production/" + savedProduction.getId());
                }
            }

            order.setStatus(ClientOrderStatus.IN_PRODUCTION);
            order.setRelatedProductionId(productionIds.isEmpty() ? null : productionIds.get(productionIds.size() - 1));
            order.setUpdatedAt(LocalDateTime.now());
            order.setUpdatedBy(user.getEmail());
            Orders saved = ordersRepository.save(order);

            auditService.log("Order", saved.getId(), "PROCESS_PRODUCTION", saved.getOrganizationId(), null,
                    "Order processed → production started: " + saved.getOrderReference());
            notificationService.createNotification(saved.getClientId(), "Production Started",
                    "Production for your order " + saved.getOrderReference() + " has started.",
                    NotificationType.ORDER, "/client-orders/" + saved.getId());

            User client = userRepository.findById(saved.getClientId()).orElse(null);
            if (client != null) {
                emailService.sendOrderConfirmedToClient(client.getEmail(), saved.getOrderReference(),
                        saved.getConfirmedDeliveryDate() != null ? saved.getConfirmedDeliveryDate().toString() : "—",
                        client.getName() != null ? client.getName() : client.getEmail());
            }

            return OrderProcessResultDTO.builder()
                    .orderId(saved.getId())
                    .orderReference(saved.getOrderReference())
                    .outcome(OrderProcessResultDTO.Outcome.PRODUCTION_STARTED)
                    .productionIds(productionIds)
                    .message("Materials available. Production started for "
                            + productionIds.size() + " item(s).")
                    .build();
        }

        String supplierId = supplierRepository.findByOrganizationId(order.getOrganizationId())
                .stream().findFirst()
                .map(s -> s.getId())
                .orElse(null);

        MaterialOrder supplyOrder = new MaterialOrder();
        supplyOrder.setId(NanoIdUtils.randomNanoId());
        supplyOrder.setOrderNumber("PO-AUTO-" + NanoIdUtils.randomNanoId().substring(0, 6).toUpperCase());
        supplyOrder.setSupplierId(supplierId);
        supplyOrder.setOrganizationId(order.getOrganizationId());
        supplyOrder.setOrderedBy(user.getEmail());
        supplyOrder.setStatus(MaterialOrderStatus.PENDING);
        supplyOrder.setNotes("Auto-generated from order " + order.getOrderReference()
                + " — awaiting admin approval.");
        supplyOrder.setSourceClientOrderId(order.getId());
        supplyOrder.setCreatedAt(LocalDateTime.now());
        supplyOrder.setUpdatedAt(LocalDateTime.now());

        List<MaterialOrderItem> supplyItems = new ArrayList<>();
        int totalQty = 0;
        for (MissingMaterialLine ml : missingLines) {
            MaterialOrderItem soi = new MaterialOrderItem();
            soi.setId(NanoIdUtils.randomNanoId());
            soi.setMaterialId(ml.getMaterialId());
            soi.setMaterialName(ml.getMaterialName());
            soi.setMaterialReference(ml.getMaterialId());
            soi.setOrderedQuantity((int) Math.ceil(ml.getMissingQuantity()));
            soi.setReceivedQuantity(0);
            soi.setAcceptedQuantity(0);
            soi.setRejectedQuantity(0);
            soi.setReturnedQuantity(0);
            soi.setRemainingQuantity((int) Math.ceil(ml.getMissingQuantity()));
            soi.setUnit(ml.getUnit());
            soi.setUnitPrice(0);
            supplyItems.add(soi);
            totalQty += soi.getOrderedQuantity();
        }
        supplyOrder.setItems(supplyItems);
        supplyOrder.setTotalOrderedQuantity(totalQty);

        MaterialOrder savedSupplyOrder = materialOrderRepository.save(supplyOrder);

        order.setStatus(ClientOrderStatus.WAITING_FOR_MATERIALS);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "PROCESS_SUPPLY_ORDER", saved.getOrganizationId(), null,
                "Order processed → materials missing, supply order " + savedSupplyOrder.getOrderNumber()
                        + " auto-created: " + saved.getOrderReference());
        auditService.log("MaterialOrder", savedSupplyOrder.getId(), "CREATE", saved.getOrganizationId(), null,
                "Auto-created from order " + saved.getOrderReference());

        notifyAdmins(order.getOrganizationId(), "Supply Order Created",
                "Order " + order.getOrderReference() + " is missing materials. "
                        + "Supply order " + savedSupplyOrder.getOrderNumber() + " was created — awaiting approval.",
                "/supply-chain");

        return OrderProcessResultDTO.builder()
                .orderId(saved.getId())
                .orderReference(saved.getOrderReference())
                .outcome(OrderProcessResultDTO.Outcome.SUPPLY_ORDER_CREATED)
                .supplyOrderId(savedSupplyOrder.getId())
                .supplyOrderNumber(savedSupplyOrder.getOrderNumber())
                .missingMaterials(missingLines)
                .message(missingLines.size() + " material(s) are insufficient. "
                        + "Supply order " + savedSupplyOrder.getOrderNumber()
                        + " created — please approve it in Supply Chain.")
                .build();
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto adminConfirm(AdminConfirmOrderDto dto) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);

        Orders order = getOrderAndCheckAccess(dto.getOrderId(), user);

        if (order.getStatus() != ClientOrderStatus.READY_FOR_CONFIRMATION
                && order.getStatus() != ClientOrderStatus.DATE_CHANGE_REQUESTED
                && order.getStatus() != ClientOrderStatus.BLOCKED_INSUFFICIENT_STOCK
                && order.getStatus() != ClientOrderStatus.BLOCKED_INSUFFICIENT_MATERIALS
                && order.getStatus() != ClientOrderStatus.BLOCKED_NO_BOM
                && order.getStatus() != ClientOrderStatus.PENDING_REVIEW) {
            throw new BadRequestException("Order cannot be confirmed in status: " + order.getStatus());
        }

        for (OrderItem item : order.getItems()) {
            if (item.getRequiredMaterials() != null && !item.getRequiredMaterials().isEmpty()) {
                for (BomMaterialLineDto matLine : item.getRequiredMaterials()) {
                    materialStockRepository.findById(matLine.getMaterialId()).ifPresent(stock -> {
                        int before = stock.getQuantity() != null ? stock.getQuantity() : 0;
                        int newQty = Math.max(0, before - (int) Math.ceil(matLine.getRequiredQuantity()));
                        stock.setQuantity(newQty);
                        stock.setLastUpdatedBy(user.getEmail());
                        stock.setUpdatedAt(LocalDateTime.now());
                        materialStockRepository.save(stock);

                        stockMovementService.recordMaterialMovement(
                                MovementType.MATERIAL_DECREASED, stock.getId(), stock.getName(),
                                stock.getUnit(), matLine.getRequiredQuantity(), before, newQty,
                                order.getId(), null, order.getOrganizationId(), user.getEmail());
                    });
                }
            } else if (item.getStatus() == OrderItemStatus.OUT_OF_STOCK
                    || item.getStatus() == OrderItemStatus.TO_PRODUCE) {
                technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                        .ifPresent(sheet -> {
                            List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                            for (MaterialSheetItem si : sheetItems) {
                                double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                                double totalNeeded = qpu * item.getQuantity();
                                if (totalNeeded <= 0) continue;
                                materialStockRepository.findById(si.getMaterialId()).ifPresent(stock -> {
                                    int before = stock.getQuantity() != null ? stock.getQuantity() : 0;
                                    int newQty = Math.max(0, before - (int) Math.ceil(totalNeeded));
                                    stock.setQuantity(newQty);
                                    stock.setLastUpdatedBy(user.getEmail());
                                    stock.setUpdatedAt(LocalDateTime.now());
                                    materialStockRepository.save(stock);

                                    stockMovementService.recordMaterialMovement(
                                            MovementType.MATERIAL_DECREASED, stock.getId(), stock.getName(),
                                            stock.getUnit(), totalNeeded, before, newQty,
                                            order.getId(), null, order.getOrganizationId(), user.getEmail());
                                });
                            }
                        });
            }

            if (item.getStatus() == OrderItemStatus.AVAILABLE) {
                productStockRepository.findByProductId(item.getProductId()).stream().findFirst()
                        .ifPresent(ps -> {
                            int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
                            int newQty = Math.max(0, before - item.getQuantity());
                            ps.setQuantity(newQty);
                            ps.setLastUpdatedBy(user.getEmail());
                            ps.setUpdatedAt(LocalDateTime.now());
                            productStockRepository.save(ps);

                            stockMovementService.recordProductMovement(
                                    MovementType.PRODUCT_DECREASED, item.getProductId(),
                                    item.getProductName(), item.getUnit(), item.getQuantity(),
                                    before, newQty, order.getId(), null,
                                    order.getOrganizationId(), user.getEmail());
                        });
            }
        }

        List<OrderItem> toProduceItems = order.getItems().stream()
                .filter(i -> i.getStatus() == OrderItemStatus.OUT_OF_STOCK
                        || i.getStatus() == OrderItemStatus.TO_PRODUCE
                        || i.getStatus() == OrderItemStatus.PARTIAL)
                .collect(Collectors.toList());

        String productionId = null;
        if (!toProduceItems.isEmpty()) {
            for (OrderItem item : toProduceItems) {
                Production production = Production.builder()
                        .id(NanoIdUtils.randomNanoId())
                        .productId(item.getProductId())
                        .organizationId(order.getOrganizationId())
                        .quantity(item.getQuantity())
                        .clientOrderId(order.getId())
                        .status(ProductionStatus.PLANNED)
                        .steps(Collections.emptyList())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                Production savedProduction = productionRepository.save(production);
                productionId = savedProduction.getId(); 

                auditService.log("Production", savedProduction.getId(), "CREATE", order.getOrganizationId(), null,
                        "Production auto-created from order " + order.getOrderReference());
                notifyAdmins(order.getOrganizationId(), "Production Started",
                        "Production for " + item.getProductName() + " started — order " + order.getOrderReference(),
                        "/production/" + savedProduction.getId());
            }
        }

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        order.setConfirmedDeliveryDate(dto.getConfirmedDeliveryDate());
        order.setRelatedProductionId(productionId);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());

        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "CONFIRM", saved.getOrganizationId(), null,
                "Order confirmed: " + saved.getOrderReference());

        notificationService.createNotification(saved.getClientId(), "Order Confirmed",
                "Your order " + saved.getOrderReference() + " is confirmed and in production. Delivery: " + dto.getConfirmedDeliveryDate(),
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        User client = userRepository.findById(saved.getClientId()).orElse(null);
        if (client != null) {
            emailService.sendOrderConfirmedToClient(
                    client.getEmail(),
                    saved.getOrderReference(),
                    dto.getConfirmedDeliveryDate() != null ? dto.getConfirmedDeliveryDate().toString() : "—",
                    client.getName() != null ? client.getName() : client.getEmail()
            );
        }

        return OrdersMapper.toDto(saved);
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto adminProposeDate(AdminProposeDateDto dto) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(dto.getOrderId(), user);

        order.setStatus(ClientOrderStatus.DATE_CHANGE_REQUESTED);
        order.setProposedDeliveryDate(dto.getProposedDeliveryDate());
        order.setAdminMessage(dto.getAdminMessage());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());

        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "PROPOSE_DATE", saved.getOrganizationId(), null,
                "New date proposed: " + dto.getProposedDeliveryDate());
        notificationService.createNotification(saved.getClientId(), "Delivery Date Change Requested",
                "New date proposed for order " + saved.getOrderReference() + ": " + dto.getProposedDeliveryDate(),
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        User clientForPropose = userRepository.findById(saved.getClientId()).orElse(null);
        if (clientForPropose != null) {
            emailService.sendDateProposedToClient(
                    clientForPropose.getEmail(),
                    saved.getOrderReference(),
                    clientForPropose.getName() != null ? clientForPropose.getName() : clientForPropose.getEmail(),
                    order.getRequestedDeliveryDate() != null ? order.getRequestedDeliveryDate().toString() : "—",
                    dto.getProposedDeliveryDate() != null ? dto.getProposedDeliveryDate().toString() : "—",
                    dto.getAdminMessage()
            );
        }

        return OrdersMapper.toDto(saved);
    }


    public OrderReviewResultDTO reviewOrder(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        Set<ClientOrderStatus> activeStatuses = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.DATE_CHANGE_REQUESTED,
                ClientOrderStatus.CONFIRMED
        );

        List<OrderReviewResultDTO.ItemReviewDTO> itemResults = new ArrayList<>();
        boolean canConfirmAll = true;

        for (OrderItem item : order.getItems()) {
            Optional<ProductStock> psOpt = productStockRepository
                    .findByProductId(item.getProductId()).stream().findFirst();
            int stock = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);

            int otherDemand = ordersRepository.findAll().stream()
                    .filter(o -> !o.getId().equals(orderId) && activeStatuses.contains(o.getStatus()))
                    .flatMap(o -> o.getItems().stream())
                    .filter(oi -> item.getProductId().equals(oi.getProductId()))
                    .mapToInt(OrderItem::getQuantity)
                    .sum();

            int effectiveAvailable = Math.max(0, stock - otherDemand);
            int productionNeeded = Math.max(0, item.getQuantity() - effectiveAvailable);
            boolean canFulfill = productionNeeded == 0;
            if (!canFulfill) canConfirmAll = false;

            itemResults.add(OrderReviewResultDTO.ItemReviewDTO.builder()
                    .productId(item.getProductId())
                    .productName(item.getProductName())
                    .orderedQuantity(item.getQuantity())
                    .availableStock(stock)
                    .otherOrdersDemand(otherDemand)
                    .effectiveAvailable(effectiveAvailable)
                    .productionNeededQty(productionNeeded)
                    .canFulfillFromStock(canFulfill)
                    .build());
        }

        return OrderReviewResultDTO.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .canConfirmDirectly(canConfirmAll)
                .items(itemResults)
                .build();
    }

    public OrderAvailabilityCheckDTO availabilityCheck(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        List<OrderAvailabilityCheckDTO.ProductAvailability> products = new ArrayList<>();
        Map<String, Double> materialNeeds = new LinkedHashMap<>();

        boolean allFromStock = true;
        boolean anyNeedsProduction = false;

        for (OrderItem item : order.getItems()) {
            int stock = productStockRepository.findByProductId(item.getProductId())
                    .stream().findFirst()
                    .map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0)
                    .orElse(0);
            int fromStock = Math.min(item.getQuantity(), stock);
            int toProduce = item.getQuantity() - fromStock;

            if (fromStock < item.getQuantity()) allFromStock = false;
            if (toProduce > 0) {
                anyNeedsProduction = true;
                final int finalToProduce = toProduce;
                technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                        .ifPresent(sheet -> {
                            List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                            for (MaterialSheetItem si : sheetItems) {
                                double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                                double needed = qpu * finalToProduce;
                                if (needed <= 0) continue;
                                materialNeeds.merge(si.getMaterialId(), needed, Double::sum);
                            }
                        });
            }

            products.add(OrderAvailabilityCheckDTO.ProductAvailability.builder()
                    .productId(item.getProductId())
                    .productName(item.getProductName())
                    .orderedQuantity(item.getQuantity())
                    .availableFinishedStock(stock)
                    .quantityFromStock(fromStock)
                    .quantityToProduce(toProduce)
                    .build());
        }

        List<OrderAvailabilityCheckDTO.MissingMaterial> missingMaterials = new ArrayList<>();
        boolean rawMaterialsEnough = true;

        for (Map.Entry<String, Double> entry : materialNeeds.entrySet()) {
            String matId = entry.getKey();
            double required = entry.getValue();
            var ms = materialStockRepository.findById(matId);
            int avail = ms.map(m -> m.getQuantity() != null ? m.getQuantity() : 0).orElse(0);
            double missing = Math.max(0.0, required - avail);
            if (missing > 0) rawMaterialsEnough = false;
            missingMaterials.add(OrderAvailabilityCheckDTO.MissingMaterial.builder()
                    .materialId(matId)
                    .materialName(ms.map(m -> m.getName()).orElse(matId))
                    .unit(ms.map(m -> m.getUnit()).orElse(""))
                    .requiredQuantity(Math.round(required * 100.0) / 100.0)
                    .availableQuantity(avail)
                    .missingQuantity(Math.round(missing * 100.0) / 100.0)
                    .build());
        }

        return OrderAvailabilityCheckDTO.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .fullyAvailableFromStock(allFromStock)
                .needsProduction(anyNeedsProduction)
                .rawMaterialsEnough(!anyNeedsProduction || rawMaterialsEnough)
                .products(products)
                .missingMaterials(missingMaterials)
                .build();
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto confirmDelivery(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        Set<ClientOrderStatus> allowedStatuses = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.DATE_CHANGE_REQUESTED,
                ClientOrderStatus.CONFIRMED
        );
        if (!allowedStatuses.contains(order.getStatus())) {
            throw new BadRequestException("Order cannot be confirmed for delivery in status: " + order.getStatus());
        }

        for (OrderItem item : order.getItems()) {
            productStockRepository.findByProductId(item.getProductId()).stream().findFirst()
                    .ifPresent(ps -> {
                        int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
                        int deduct = Math.min(item.getQuantity(), before);
                        int newQty = before - deduct;
                        ps.setQuantity(newQty);
                        ps.setLastUpdatedBy(user.getEmail());
                        ps.setUpdatedAt(LocalDateTime.now());
                        productStockRepository.save(ps);
                        stockMovementService.recordProductMovement(
                                MovementType.PRODUCT_DECREASED, item.getProductId(),
                                item.getProductName(), item.getUnit(), deduct,
                                before, newQty, order.getId(), null,
                                order.getOrganizationId(), user.getEmail());
                    });
        }

        order.setStatus(ClientOrderStatus.READY);
        order.setDeliveryToken(com.aventrix.jnanoid.jnanoid.NanoIdUtils.randomNanoId());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "CONFIRM_DELIVERY", saved.getOrganizationId(), null,
                "Order confirmed for direct delivery (full stock): " + saved.getOrderReference());
        notificationService.createNotification(saved.getClientId(), "Order Ready for Delivery",
                "Your order " + saved.getOrderReference() + " is ready for delivery!",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ORDER,
                "/client-orders/" + saved.getId());

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto startProductionWithMaterials(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        Set<ClientOrderStatus> allowed = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.DATE_CHANGE_REQUESTED,
                ClientOrderStatus.CONFIRMED
        );
        if (!allowed.contains(order.getStatus())) {
            throw new BadRequestException("Order cannot start production in status: " + order.getStatus());
        }

        String lastProductionId = null;

        for (OrderItem item : order.getItems()) {
            int stock = productStockRepository.findByProductId(item.getProductId())
                    .stream().findFirst()
                    .map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0)
                    .orElse(0);
            int fromStock = Math.min(item.getQuantity(), stock);
            int toProduce = item.getQuantity() - fromStock;

            if (fromStock > 0) {
                final int finalFromStock = fromStock;
                productStockRepository.findByProductId(item.getProductId()).stream().findFirst()
                        .ifPresent(ps -> {
                            int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
                            int newQty = Math.max(0, before - finalFromStock);
                            ps.setQuantity(newQty);
                            ps.setLastUpdatedBy(user.getEmail());
                            ps.setUpdatedAt(LocalDateTime.now());
                            productStockRepository.save(ps);
                            stockMovementService.recordProductMovement(
                                    MovementType.PRODUCT_DECREASED, item.getProductId(),
                                    item.getProductName(), item.getUnit(), finalFromStock,
                                    before, newQty, order.getId(), null,
                                    order.getOrganizationId(), user.getEmail());
                        });
            }

            if (toProduce > 0) {
                final int finalToProduce = toProduce;
                technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                        .ifPresent(sheet -> {
                            List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                            for (MaterialSheetItem si : sheetItems) {
                                double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                                double needed = qpu * finalToProduce;
                                if (needed <= 0) continue;
                                materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                                    int before = ms.getQuantity() != null ? ms.getQuantity() : 0;
                                    int newQty = Math.max(0, before - (int) Math.ceil(needed));
                                    ms.setQuantity(newQty);
                                    ms.setLastUpdatedBy(user.getEmail());
                                    ms.setUpdatedAt(LocalDateTime.now());
                                    materialStockRepository.save(ms);
                                    stockMovementService.recordMaterialMovement(
                                            MovementType.MATERIAL_DECREASED, ms.getId(), ms.getName(),
                                            ms.getUnit(), needed, before, newQty,
                                            order.getId(), null, order.getOrganizationId(), user.getEmail());
                                });
                            }
                        });

                Production production = Production.builder()
                        .id(com.aventrix.jnanoid.jnanoid.NanoIdUtils.randomNanoId())
                        .productId(item.getProductId())
                        .organizationId(order.getOrganizationId())
                        .quantity(toProduce)
                        .clientOrderId(order.getId())
                        .status(ProductionStatus.PLANNED)
                        .steps(Collections.emptyList())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                Production savedProduction = productionRepository.save(production);
                lastProductionId = savedProduction.getId();

                auditService.log("Production", savedProduction.getId(), "CREATE", order.getOrganizationId(), null,
                        "Production of " + toProduce + " × " + item.getProductName()
                                + " started for order " + order.getOrderReference());
                notifyAdmins(order.getOrganizationId(), "Production Started",
                        toProduce + " × " + item.getProductName()
                                + " queued for production (order " + order.getOrderReference() + ")",
                        "/production/" + savedProduction.getId());
            }
        }

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        order.setRelatedProductionId(lastProductionId);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "START_PRODUCTION", saved.getOrganizationId(), null,
                "Production started for order: " + saved.getOrderReference());
        notificationService.createNotification(saved.getClientId(), "Production Started",
                "Production for your order " + saved.getOrderReference() + " has started.",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ORDER,
                "/client-orders/" + saved.getId());

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto launchProductionForShortfall(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.PENDING_REVIEW
                && order.getStatus() != ClientOrderStatus.READY_FOR_CONFIRMATION
                && order.getStatus() != ClientOrderStatus.DATE_CHANGE_REQUESTED) {
            throw new BadRequestException("Order is not in a reviewable status");
        }

        Set<ClientOrderStatus> activeStatuses = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.DATE_CHANGE_REQUESTED,
                ClientOrderStatus.CONFIRMED
        );

        String lastProductionId = null;
        for (OrderItem item : order.getItems()) {
            Optional<ProductStock> psOpt = productStockRepository
                    .findByProductId(item.getProductId()).stream().findFirst();
            int stock = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);

            int otherDemand = ordersRepository.findAll().stream()
                    .filter(o -> !o.getId().equals(orderId) && activeStatuses.contains(o.getStatus()))
                    .flatMap(o -> o.getItems().stream())
                    .filter(oi -> item.getProductId().equals(oi.getProductId()))
                    .mapToInt(OrderItem::getQuantity)
                    .sum();

            int effectiveAvailable = Math.max(0, stock - otherDemand);
            int productionNeeded = Math.max(0, item.getQuantity() - effectiveAvailable);

            if (productionNeeded > 0) {
                Production production = Production.builder()
                        .id(NanoIdUtils.randomNanoId())
                        .productId(item.getProductId())
                        .organizationId(order.getOrganizationId())
                        .quantity(productionNeeded)
                        .clientOrderId(order.getId())
                        .status(ProductionStatus.PLANNED)
                        .steps(Collections.emptyList())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                Production saved = productionRepository.save(production);
                lastProductionId = saved.getId();

                auditService.log("Production", saved.getId(), "CREATE", order.getOrganizationId(), null,
                        "Production of " + productionNeeded + " × " + item.getProductName()
                                + " launched for order " + order.getOrderReference());
                notifyAdmins(order.getOrganizationId(), "Production Launched",
                        productionNeeded + " × " + item.getProductName()
                                + " queued for production (order " + order.getOrderReference() + ")",
                        "/production/" + saved.getId());
            }
        }

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        order.setRelatedProductionId(lastProductionId);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "LAUNCH_PRODUCTION", saved.getOrganizationId(), null,
                "Admin launched production for shortfall on order " + saved.getOrderReference());
        notificationService.createNotification(saved.getClientId(), "Production Launched",
                "Production has been launched for your order " + saved.getOrderReference() + ".",
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto markReady(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.IN_PRODUCTION && order.getStatus() != ClientOrderStatus.PRODUCTION_COMPLETED) {
            throw new BadRequestException("Order must be IN_PRODUCTION or PRODUCTION_COMPLETED to mark as READY");
        }

        order.setStatus(ClientOrderStatus.READY);
        order.setDeliveryToken(NanoIdUtils.randomNanoId());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notificationService.createNotification(saved.getClientId(), "Order Ready",
                "Your order " + saved.getOrderReference() + " is ready for delivery!",
                NotificationType.ORDER, "/client-orders/" + saved.getId());
        auditService.log("Order", saved.getId(), "READY", saved.getOrganizationId(), null,
                "Order marked as ready: " + saved.getOrderReference());

        User clientReady = userRepository.findById(saved.getClientId()).orElse(null);
        if (clientReady != null) {
            emailService.sendOrderReadyToClient(
                    clientReady.getEmail(),
                    saved.getOrderReference(),
                    clientReady.getName() != null ? clientReady.getName() : clientReady.getEmail(),
                    saved.getConfirmedDeliveryDate() != null ? saved.getConfirmedDeliveryDate().toString() : ""
            );
        }

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto startProduction(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.CONFIRMED) {
            throw new BadRequestException("Order must be CONFIRMED to start production");
        }

        List<OrderItem> readyItems = order.getItems().stream()
                .filter(i -> i.isMaterialsAvailable()
                        && (i.getStatus() == OrderItemStatus.AVAILABLE
                            || i.getStatus() == OrderItemStatus.PARTIAL))
                .collect(Collectors.toList());

        if (readyItems.isEmpty()) {
            throw new BadRequestException("No items with sufficient materials to start production");
        }

        String productionId = null;
        for (OrderItem item : readyItems) {
            if (item.getRequiredMaterials() != null) {
                for (var matLine : item.getRequiredMaterials()) {
                    materialStockRepository.findById(matLine.getMaterialId()).ifPresent(stock -> {
                        int before = stock.getQuantity() != null ? stock.getQuantity() : 0;
                        int newQty = Math.max(0, before - (int) Math.ceil(matLine.getRequiredQuantity()));
                        stock.setQuantity(newQty);
                        stock.setLastUpdatedBy(user.getEmail());
                        stock.setUpdatedAt(LocalDateTime.now());
                        materialStockRepository.save(stock);
                        stockMovementService.recordMaterialMovement(
                                MovementType.MATERIAL_DECREASED, stock.getId(), stock.getName(),
                                stock.getUnit(), matLine.getRequiredQuantity(), before, newQty,
                                order.getId(), null, order.getOrganizationId(), user.getEmail());
                    });
                }
            }

            Production production = Production.builder()
                    .id(NanoIdUtils.randomNanoId())
                    .productId(item.getProductId())
                    .organizationId(order.getOrganizationId())
                    .quantity(item.getQuantity())
                    .clientOrderId(order.getId())
                    .status(ProductionStatus.PLANNED)
                    .steps(Collections.emptyList())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            Production savedProduction = productionRepository.save(production);
            productionId = savedProduction.getId();

            auditService.log("Production", savedProduction.getId(), "CREATE", order.getOrganizationId(), null,
                    "Production started from order " + order.getOrderReference());
            notifyAdmins(order.getOrganizationId(), "Production Started",
                    "Production for " + item.getProductName() + " started — order " + order.getOrderReference(),
                    "/production/" + savedProduction.getId());
        }

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        order.setRelatedProductionId(productionId);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "START_PRODUCTION", saved.getOrganizationId(), null,
                "Production started for order: " + saved.getOrderReference());
        notificationService.createNotification(saved.getClientId(), "Production Started",
                "Production for your order " + saved.getOrderReference() + " has started.",
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto markDelivered(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.READY) {
            throw new BadRequestException("Order must be READY before marking as DELIVERED");
        }

        for (OrderItem item : order.getItems()) {
            stockMovementService.recordProductMovement(
                    MovementType.PRODUCT_DELIVERED, item.getProductId(),
                    item.getProductName(), item.getUnit(), item.getQuantity(),
                    0, 0, order.getId(), order.getRelatedProductionId(),
                    order.getOrganizationId(), user.getEmail());
        }

        order.setStatus(ClientOrderStatus.DELIVERED);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notificationService.createNotification(saved.getClientId(), "Order Delivered",
                "Your order " + saved.getOrderReference() + " has been delivered!",
                NotificationType.ORDER, "/client-orders/" + saved.getId());
        auditService.log("Order", saved.getId(), "DELIVERED", saved.getOrganizationId(), null,
                "Order delivered: " + saved.getOrderReference());

        User clientDelivered = userRepository.findById(saved.getClientId()).orElse(null);
        if (clientDelivered != null) {
            emailService.sendOrderDeliveredToClient(
                    clientDelivered.getEmail(),
                    saved.getOrderReference(),
                    clientDelivered.getName() != null ? clientDelivered.getName() : clientDelivered.getEmail()
            );
        }

        return OrdersMapper.toDto(saved);
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto clientAccept(ClientRespondDto dto) {
        User user = getCurrentUser();
        Orders order = ordersRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!order.getClientId().equals(user.getId()))
            throw new ForbiddenException("You can only respond to your own orders");
        if (order.getStatus() != ClientOrderStatus.DATE_CHANGE_REQUESTED)
            throw new BadRequestException("No pending date proposal to accept");

        order.setStatus(ClientOrderStatus.READY_FOR_CONFIRMATION);
        order.setConfirmedDeliveryDate(order.getProposedDeliveryDate());
        order.setClientResponseMessage(dto.getClientResponseMessage());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "CLIENT_ACCEPT", saved.getOrganizationId(), null,
                "Client accepted new date");
        notifyAdmins(saved.getOrganizationId(), "Client Accepted New Date",
                "Client accepted the proposed date for " + saved.getOrderReference(),
                "/orders");

        String acceptedDate = saved.getConfirmedDeliveryDate() != null ? saved.getConfirmedDeliveryDate().toString() : "—";
        String clientName = user.getName() != null ? user.getName() : user.getEmail();
        userRepository.findByRole(Roles.ADMIN).forEach(admin ->
                emailService.sendClientAcceptedDateToAdmin(admin.getEmail(), saved.getOrderReference(),
                        clientName, acceptedDate, dto.getClientResponseMessage()));
        userRepository.findByRole(Roles.SUBADMIN).stream()
                .filter(u -> permissionService.canAccessOrganization(u, saved.getOrganizationId()))
                .forEach(admin -> emailService.sendClientAcceptedDateToAdmin(admin.getEmail(), saved.getOrderReference(),
                        clientName, acceptedDate, dto.getClientResponseMessage()));

        return OrdersMapper.toDto(saved);
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto clientReject(ClientRespondDto dto) {
        User user = getCurrentUser();
        Orders order = ordersRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!order.getClientId().equals(user.getId()))
            throw new ForbiddenException("You can only respond to your own orders");
        if (order.getStatus() != ClientOrderStatus.DATE_CHANGE_REQUESTED)
            throw new BadRequestException("No pending date proposal to reject");

        order.setStatus(ClientOrderStatus.REJECTED);
        order.setClientResponseMessage(dto.getClientResponseMessage());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "CLIENT_REJECT", saved.getOrganizationId(), null,
                "Client rejected new date");
        notifyAdmins(saved.getOrganizationId(), "Client Rejected New Date",
                "Client rejected the proposed date for " + saved.getOrderReference(),
                "/orders");

        String proposedDate = order.getProposedDeliveryDate() != null ? order.getProposedDeliveryDate().toString() : "—";
        String clientNameReject = user.getName() != null ? user.getName() : user.getEmail();
        userRepository.findByRole(Roles.ADMIN).forEach(admin ->
                emailService.sendClientRejectedDateToAdmin(admin.getEmail(), saved.getOrderReference(),
                        clientNameReject, proposedDate, dto.getClientResponseMessage()));
        userRepository.findByRole(Roles.SUBADMIN).stream()
                .filter(u -> permissionService.canAccessOrganization(u, saved.getOrganizationId()))
                .forEach(admin -> emailService.sendClientRejectedDateToAdmin(admin.getEmail(), saved.getOrderReference(),
                        clientNameReject, proposedDate, dto.getClientResponseMessage()));

        return OrdersMapper.toDto(saved);
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto cancel(String orderId, String reason) {
        User user = getCurrentUser();
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (user.getRole() == Roles.CLIENT && !order.getClientId().equals(user.getId()))
            throw new ForbiddenException("You can only cancel your own orders");
        if (user.getRole() != Roles.CLIENT && !permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied");
        if (order.getStatus() == ClientOrderStatus.IN_PRODUCTION || order.getStatus() == ClientOrderStatus.DELIVERED)
            throw new BadRequestException("Cannot cancel an order that is already in production or delivered");

        order.setStatus(ClientOrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "CANCEL", saved.getOrganizationId(), null,
                "Order cancelled: " + saved.getOrderReference() + (reason != null && !reason.isBlank() ? " | Reason: " + reason : ""));
        notificationService.createNotification(saved.getClientId(), "Order Cancelled",
                "Order " + saved.getOrderReference() + " has been cancelled." + (reason != null && !reason.isBlank() ? " Reason: " + reason : ""),
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        User client = userRepository.findById(saved.getClientId()).orElse(null);
        if (client != null) {
            String cancelReason = reason != null && !reason.isBlank() ? reason : "Your order has been cancelled by the admin.";
            emailService.sendOrderCancelledToClient(
                    client.getEmail(),
                    saved.getOrderReference(),
                    cancelReason,
                    client.getName() != null ? client.getName() : "Client"
            );
        }

        return OrdersMapper.toDto(saved);
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto deliverByToken(String token) {
        Orders order = ordersRepository.findByDeliveryTokenAndStatus(token, ClientOrderStatus.READY)
                .orElseThrow(() -> new NotFoundException("Invalid or expired delivery token"));

        for (OrderItem item : order.getItems()) {
            stockMovementService.recordProductMovement(
                    MovementType.PRODUCT_DELIVERED, item.getProductId(),
                    item.getProductName(), item.getUnit(), item.getQuantity(),
                    0, 0, order.getId(), order.getRelatedProductionId(),
                    order.getOrganizationId(), "QR_SCAN");
        }

        order.setStatus(ClientOrderStatus.DELIVERED);
        order.setDeliveryToken(null);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy("QR_DELIVERY");
        Orders saved = ordersRepository.save(order);

        notificationService.createNotification(saved.getClientId(), "Order Delivered",
                "Your order " + saved.getOrderReference() + " has been confirmed as delivered via QR scan!",
                NotificationType.ORDER, "/client-orders/" + saved.getId());
        auditService.log("Order", saved.getId(), "DELIVERED_QR", saved.getOrganizationId(), null,
                "Order delivered via QR scan: " + saved.getOrderReference());

        User clientD = userRepository.findById(saved.getClientId()).orElse(null);
        if (clientD != null) {
            emailService.sendOrderDeliveredToClient(clientD.getEmail(), saved.getOrderReference(),
                    clientD.getName() != null ? clientD.getName() : clientD.getEmail());
        }

        return OrdersMapper.toDto(saved);
    }


    @Cacheable(value = "allOrders")
    public List<OrderResponseDto> getAll() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) {
            return ordersRepository.findByClientId(user.getId()).stream()
                    .map(OrdersMapper::toDto).toList();
        }
        return ordersRepository.findAll().stream()
                .filter(o -> permissionService.isAdmin(user)
                        || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .map(OrdersMapper::toDto).toList();
    }

    public List<OrderResponseDto> getMyOrders() {
        User user = getCurrentUser();
        return ordersRepository.findByClientId(user.getId()).stream()
                .map(OrdersMapper::toDto).toList();
    }

    @Cacheable(value = "orders", key = "#id")
    public OrderResponseDto getById(String id) {
        User user = getCurrentUser();
        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (user.getRole() == Roles.CLIENT) {
            if (!order.getClientId().equals(user.getId()))
                throw new ForbiddenException("Access denied");
        } else if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Access denied");
        }
        return OrdersMapper.toDto(order);
    }

    public List<OrderResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId))
            throw new ForbiddenException("Access denied");
        return ordersRepository.findByOrganizationId(organizationId).stream()
                .map(OrdersMapper::toDto).toList();
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public void delete(String id) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied");
        ordersRepository.deleteById(id);
        auditService.log("Order", id, "DELETE", order.getOrganizationId(), null,
                "Order deleted: " + order.getOrderReference());
    }


    private Orders getOrderAndCheckAccess(String orderId, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("You are not allowed to manage this order");
        return order;
    }

    private void requireAdminOrSubAdmin(User user) {
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Only admins can perform this action");
    }

    private void notifyAdmins(String organizationId, String title, String message, String link) {
        userRepository.findByRole(Roles.ADMIN).forEach(u ->
                notificationService.createNotification(u.getId(), title, message, NotificationType.ORDER, link));
        userRepository.findByRole(Roles.SUBADMIN).stream()
                .filter(u -> permissionService.canAccessOrganization(u, organizationId))
                .forEach(u -> notificationService.createNotification(u.getId(), title, message, NotificationType.ORDER, link));
    }

    private String generateOrderReference() {
        for (int i = 0; i < 5; i++) {
            String ref = "ORD-" + NanoIdUtils.randomNanoId().substring(0, 8).toUpperCase();
            if (!ordersRepository.existsByOrderReference(ref)) return ref;
        }
        throw new BadRequestException("Could not generate unique order reference");
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
