package com.dppsmart.dppsmart.Orders.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.MaterialStock.Services.MaterialStockService;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Notification.Services.RealtimeEventService;
import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.DTO.OrderProcessResultDTO.MissingMaterialLine;
import com.dppsmart.dppsmart.Orders.Entities.*;
import com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.ProductStock.Services.ProductStockService;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomMaterialLineDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderWorkflowService {

    private final OrdersRepository ordersRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final ProductionRepository productionRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final StockMovementService stockMovementService;
    private final MaterialStockService materialStockService;
    private final ProductStockService productStockService;
    private final NotificationServiceImpl notificationService;
    private final RealtimeEventService realtimeEventService;
    private final AuditService auditService;
    private final PermissionService permissionService;
    private final UserRepository userRepository;

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto confirmOrder(String orderId, LocalDate confirmedDeliveryDate,
                                         OrderPriority priority, String adminMessage) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        order.setStatus(ClientOrderStatus.CONFIRMED);
        order.setConfirmedDeliveryDate(confirmedDeliveryDate);
        order.setOrderPriority(priority != null ? priority : OrderPriority.NORMAL);
        if (adminMessage != null) order.setAdminMessage(adminMessage);
        order.setConfirmedBy(user.getEmail());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());

        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "CONFIRM", saved.getOrganizationId(), null,
                "Order confirmed by " + user.getEmail() + " | priority=" + priority);
        notificationService.createNotification(saved.getClientId(), "Order Confirmed",
                "Your order " + saved.getOrderReference() + " has been confirmed.",
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
        return dto;
    }

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto setPriority(String orderId, OrderPriority priority) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        order.setOrderPriority(priority);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);
        auditService.log("Order", saved.getId(), "SET_PRIORITY", saved.getOrganizationId(), null,
                "Priority set to " + priority + " by " + user.getEmail());

        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderUpdated(dto);
        return dto;
    }


    public WorkflowStockCheckResult checkStock(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        List<WorkflowStockCheckResult.ItemStockInfo> itemInfos = new ArrayList<>();
        boolean allAvailable = true;
        boolean anyAvailable = false;

        for (OrderItem item : order.getItems()) {
            int stock = getProductStock(item.getProductId());
            int allocated = Math.min(item.getQuantity(), stock);
            int missing = item.getQuantity() - allocated;
            if (missing > 0) allAvailable = false;
            if (allocated > 0) anyAvailable = true;

            List<MaterialRequirementInfo> matReqs = new ArrayList<>();
            boolean matsOk = true;
            if (missing > 0) {
                matReqs = calculateMaterialRequirements(item.getProductId(), missing, order.getOrganizationId());
                matsOk = matReqs.stream().allMatch(m -> m.getMissingQuantity() <= 0);
            }

            itemInfos.add(WorkflowStockCheckResult.ItemStockInfo.builder()
                    .productId(item.getProductId())
                    .productName(item.getProductName())
                    .requiredQuantity(item.getQuantity())
                    .availableStock(stock)
                    .allocatedQuantity(allocated)
                    .missingQuantity(missing)
                    .materialRequirements(matReqs)
                    .materialsAvailable(matsOk)
                    .build());
        }

        String recommendation;
        if (allAvailable) {
            recommendation = "READY_FOR_DELIVERY";
        } else if (itemInfos.stream().allMatch(i -> i.getMaterialRequirements().stream().allMatch(m -> m.getMissingQuantity() <= 0))) {
            recommendation = "START_PRODUCTION";
        } else {
            recommendation = "CREATE_SUPPLY_CHAIN_ORDER";
        }

        return WorkflowStockCheckResult.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .allAvailable(allAvailable)
                .anyAvailable(anyAvailable)
                .items(itemInfos)
                .recommendation(recommendation)
                .build();
    }


    public SimulationResult simulate(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        List<SimulationResult.ItemSimulation> items = new ArrayList<>();
        Map<String, Double> totalMaterialNeeds = new LinkedHashMap<>();
        Map<String, String> matNames = new HashMap<>();
        Map<String, String> matUnits = new HashMap<>();

        boolean allInStock = true;
        boolean allMatsAvailable = true;

        for (OrderItem oi : order.getItems()) {
            int stock = getProductStock(oi.getProductId());
            int fromStock = Math.min(oi.getQuantity(), stock);
            int toProduce = oi.getQuantity() - fromStock;
            if (toProduce > 0) allInStock = false;

            List<MaterialRequirementInfo> matInfos = new ArrayList<>();
            if (toProduce > 0) {
                matInfos = calculateMaterialRequirements(oi.getProductId(), toProduce, order.getOrganizationId());
                for (MaterialRequirementInfo m : matInfos) {
                    totalMaterialNeeds.merge(m.getMaterialId(), m.getRequiredQuantity(), Double::sum);
                    matNames.put(m.getMaterialId(), m.getMaterialName());
                    matUnits.put(m.getMaterialId(), m.getUnit());
                }
            }

            items.add(SimulationResult.ItemSimulation.builder()
                    .productId(oi.getProductId())
                    .productName(oi.getProductName())
                    .requiredQuantity(oi.getQuantity())
                    .availableInStock(fromStock)
                    .toProduce(toProduce)
                    .materialRequirements(matInfos)
                    .build());
        }

        List<MaterialRequirementInfo> consolidatedMats = new ArrayList<>();
        for (Map.Entry<String, Double> e : totalMaterialNeeds.entrySet()) {
            int avail = getMaterialStock(e.getKey());
            double missing = Math.max(0, e.getValue() - avail);
            if (missing > 0) allMatsAvailable = false;
            consolidatedMats.add(MaterialRequirementInfo.builder()
                    .materialId(e.getKey())
                    .materialName(matNames.getOrDefault(e.getKey(), e.getKey()))
                    .unit(matUnits.getOrDefault(e.getKey(), ""))
                    .requiredQuantity(e.getValue())
                    .availableQuantity(avail)
                    .missingQuantity(missing)
                    .build());
        }

        String outcome;
        String message;
        if (allInStock) {
            outcome = "READY_FOR_DELIVERY";
            message = "All products are in stock. Order can be delivered immediately.";
        } else if (allMatsAvailable) {
            outcome = "START_PRODUCTION";
            message = "Some products need production. All materials are available. Production can start now.";
        } else {
            outcome = "NEEDS_SUPPLY_CHAIN";
            message = "Some materials are missing. A supply chain order must be created before production.";
        }

        SimulationResult result = SimulationResult.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .outcome(outcome)
                .message(message)
                .allInStock(allInStock)
                .allMaterialsAvailable(allMatsAvailable)
                .items(items)
                .consolidatedMaterials(consolidatedMats)
                .estimatedDeliveryDate(order.getConfirmedDeliveryDate() != null
                        ? order.getConfirmedDeliveryDate().toString() : null)
                .build();

        realtimeEventService.broadcastSimulationResult(orderId, result);
        return result;
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderProcessResultDTO processOrderFull(String orderId, LocalDate confirmedDeliveryDate) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        Set<ClientOrderStatus> allowed = Set.of(
                ClientOrderStatus.PENDING_REVIEW,
                ClientOrderStatus.READY_FOR_CONFIRMATION,
                ClientOrderStatus.CONFIRMED,
                ClientOrderStatus.STOCK_CHECKED,
                ClientOrderStatus.PARTIALLY_AVAILABLE,
                ClientOrderStatus.DATE_CHANGE_REQUESTED
        );
        if (!allowed.contains(order.getStatus())) {
            throw new BadRequestException("Order cannot be processed in status: " + order.getStatus());
        }
        if (confirmedDeliveryDate != null) order.setConfirmedDeliveryDate(confirmedDeliveryDate);

        record ItemPlan(OrderItem item, int fromStock, int toProduce) {}
        List<ItemPlan> plans = new ArrayList<>();
        boolean allFromStock = true;
        Map<String, Double> materialNeeds = new LinkedHashMap<>();
        Map<String, String> matNames = new LinkedHashMap<>();
        Map<String, String> matUnits = new LinkedHashMap<>();

        for (OrderItem item : order.getItems()) {
            int stock = getProductStock(item.getProductId());
            int fromStock = Math.min(item.getQuantity(), stock);
            int toProduce = item.getQuantity() - fromStock;
            if (toProduce > 0) allFromStock = false;
            plans.add(new ItemPlan(item, fromStock, toProduce));

            if (toProduce > 0) {
                technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                        .ifPresent(sheet -> {
                            for (MaterialSheetItem si : materialSheetItemRepository.findByTechnicalSheetId(sheet.getId())) {
                                if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                                double needed = si.getQuantityPerUnit() * toProduce;
                                materialNeeds.merge(si.getMaterialId(), needed, Double::sum);
                                materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                                    matNames.put(ms.getId(), ms.getName());
                                    matUnits.put(ms.getId(), ms.getUnit() != null ? ms.getUnit() : "");
                                });
                            }
                        });
            }
        }

        if (allFromStock) {
            for (ItemPlan plan : plans) deductProductStock(plan.item(), plan.fromStock(), order, user);
            order.setStatus(ClientOrderStatus.READY_FOR_DELIVERY);
            order.setDeliveryReadyAt(LocalDateTime.now());
            order.setDeliveryToken(NanoIdUtils.randomNanoId());
            order.setStockCheckedAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            order.setUpdatedBy(user.getEmail());
            Orders saved = ordersRepository.save(order);

            notifyClient(saved, "Order Ready for Delivery",
                    "Your order " + saved.getOrderReference() + " is ready — all items in stock!");
            OrderResponseDto dto = OrdersMapper.toDto(saved);
            realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
            auditService.log("Order", saved.getId(), "PROCESS_READY", saved.getOrganizationId(), null,
                    "Processed → all in stock, ready for delivery");

            return OrderProcessResultDTO.builder()
                    .orderId(saved.getId()).orderReference(saved.getOrderReference())
                    .outcome(OrderProcessResultDTO.Outcome.DELIVERED)
                    .deliveryToken(saved.getDeliveryToken())
                    .message("All items available in stock. Ready for delivery.").build();
        }

        List<MissingMaterialLine> missingLines = new ArrayList<>();
        boolean allMatsAvailable = true;
        for (Map.Entry<String, Double> e : materialNeeds.entrySet()) {
            int avail = getMaterialStock(e.getKey());
            double missing = Math.max(0, e.getValue() - avail);
            if (missing > 0) {
                allMatsAvailable = false;
                missingLines.add(MissingMaterialLine.builder()
                        .materialId(e.getKey())
                        .materialName(matNames.getOrDefault(e.getKey(), e.getKey()))
                        .unit(matUnits.getOrDefault(e.getKey(), ""))
                        .requiredQuantity(round2(e.getValue()))
                        .availableQuantity(avail)
                        .missingQuantity(round2(missing)).build());
            }
        }

        if (allMatsAvailable) {
            List<String> prodIds = new ArrayList<>();
            for (ItemPlan plan : plans) {
                if (plan.fromStock() > 0) deductProductStock(plan.item(), plan.fromStock(), order, user);
                if (plan.toProduce() > 0) {
                    Production prod = Production.builder()
                            .id(NanoIdUtils.randomNanoId())
                            .productId(plan.item().getProductId())
                            .organizationId(order.getOrganizationId())
                            .quantity(plan.toProduce())
                            .clientOrderId(order.getId())
                            .status(ProductionStatus.IN_PROGRESS)
                            .startedAt(LocalDateTime.now())
                            .estimatedEndDate(order.getConfirmedDeliveryDate() != null
                                    ? order.getConfirmedDeliveryDate().minusDays(1) : LocalDate.now().plusDays(3))
                            .priority(order.getPriority())
                            .steps(List.of())
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    Production saved = productionRepository.save(prod);
                    prodIds.add(saved.getId());
                    plan.item().setRelatedProductionId(saved.getId());
                    plan.item().setStatus(OrderItemStatus.IN_PRODUCTION);

                    consumeMaterialsForProduction(plan.item().getProductId(), plan.toProduce(), order, user);
                    realtimeEventService.broadcastProductionStarted(saved.getId(), order.getId(), plan.item().getProductId());
                }
            }

            order.setRelatedProductionIds(prodIds);
            order.setStatus(ClientOrderStatus.IN_PRODUCTION);
            order.setProductionStartedAt(LocalDateTime.now());
            order.setStockCheckedAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            order.setUpdatedBy(user.getEmail());
            Orders saved = ordersRepository.save(order);

            notifyClient(saved, "Production Started",
                    "Production for your order " + saved.getOrderReference() + " has started.");
            OrderResponseDto dto = OrdersMapper.toDto(saved);
            realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
            auditService.log("Order", saved.getId(), "PRODUCTION_STARTED", saved.getOrganizationId(), null,
                    "Production started: " + prodIds);

            return OrderProcessResultDTO.builder()
                    .orderId(saved.getId()).orderReference(saved.getOrderReference())
                    .outcome(OrderProcessResultDTO.Outcome.PRODUCTION_STARTED)
                    .productionIds(prodIds)
                    .message("Production started for " + prodIds.size() + " product(s).").build();
        }

        String poNumber = "PO-" + System.currentTimeMillis();
        List<MaterialOrderItem> poItems = missingLines.stream().map(ml -> {
            MaterialOrderItem poi = new MaterialOrderItem();
            poi.setId(NanoIdUtils.randomNanoId());
            poi.setMaterialId(ml.getMaterialId());
            poi.setMaterialName(ml.getMaterialName());
            poi.setOrderedQuantity((int) Math.ceil(ml.getMissingQuantity()));
            poi.setReceivedQuantity(0);
            poi.setAcceptedQuantity(0);
            poi.setRejectedQuantity(0);
            poi.setReturnedQuantity(0);
            poi.setRemainingQuantity((int) Math.ceil(ml.getMissingQuantity()));
            poi.setUnit(ml.getUnit());
            poi.setUnitPrice(0);
            return poi;
        }).collect(Collectors.toList());

        MaterialOrder po = new MaterialOrder();
        po.setId(NanoIdUtils.randomNanoId());
        po.setOrderNumber(poNumber);
        po.setOrganizationId(order.getOrganizationId());
        po.setOrderedBy(user.getEmail());
        po.setStatus(MaterialOrderStatus.PENDING);
        po.setItems(poItems);
        po.setSourceClientOrderId(order.getId());
        po.setCreatedAt(LocalDateTime.now());
        po.setUpdatedAt(LocalDateTime.now());
        MaterialOrder savedPo = materialOrderRepository.save(po);

        order.setSupplyChainOrderId(savedPo.getId());
        order.setStatus(ClientOrderStatus.WAITING_FOR_MATERIALS);
        order.setStockCheckedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notifyAdmins(saved.getOrganizationId(), "Supply Chain Order Created",
                "Missing materials for order " + saved.getOrderReference() + " — PO: " + poNumber, "/supply-chain");
        notifyClient(saved, "Waiting for Materials",
                "Your order " + saved.getOrderReference() + " is waiting for materials to arrive.");
        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
        realtimeEventService.broadcastSupplyChainOrderCreated(savedPo.getId(), saved.getId(), missingLines);
        auditService.log("Order", saved.getId(), "SUPPLY_ORDER_CREATED", saved.getOrganizationId(), null,
                "Supply order " + poNumber + " created for missing materials");

        return OrderProcessResultDTO.builder()
                .orderId(saved.getId()).orderReference(saved.getOrderReference())
                .outcome(OrderProcessResultDTO.Outcome.SUPPLY_ORDER_CREATED)
                .supplyOrderId(savedPo.getId())
                .supplyOrderNumber(poNumber)
                .missingMaterials(missingLines)
                .message("Materials missing. Supply chain order " + poNumber + " created.").build();
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto completeProduction(String productionId) {
        User user = requireAdminOrSubAdmin();
        Production prod = productionRepository.findById(productionId)
                .orElseThrow(() -> new NotFoundException("Production not found: " + productionId));
        if (!permissionService.canAccessOrganization(user, prod.getOrganizationId()))
            throw new ForbiddenException("Access denied");
        if (prod.getStatus() == ProductionStatus.COMPLETED)
            throw new BadRequestException("Production already completed");

        prod.setStatus(ProductionStatus.COMPLETED);
        prod.setCompletedAt(LocalDateTime.now());
        prod.setUpdatedAt(LocalDateTime.now());
        productionRepository.save(prod);

        productStockRepository.findByProductId(prod.getProductId()).stream().findFirst()
                .ifPresent(ps -> {
                    int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
                    int newQty = before + prod.getQuantity();
                    ps.setQuantity(newQty);
                    ps.setLastUpdatedBy(user.getEmail());
                    ps.setUpdatedAt(LocalDateTime.now());
                    ps.setLastProductionId(prod.getId());
                    ps.setLastProductionAt(LocalDateTime.now());
                    ps.setTotalProduced(ps.getTotalProduced() + prod.getQuantity());
                    productStockRepository.save(ps);
                    stockMovementService.recordProductMovement(MovementType.PRODUCT_PRODUCED,
                            prod.getProductId(), ps.getProductName(), ps.getUnit(),
                            prod.getQuantity(), before, newQty,
                            prod.getClientOrderId(), prod.getId(),
                            prod.getOrganizationId(), user.getEmail());
                    realtimeEventService.broadcastProductStockUpdated(prod.getProductId(), newQty, prod.getOrganizationId());
                });

        realtimeEventService.broadcastProductionCompleted(prod.getId(), prod.getClientOrderId(),
                prod.getProductId(), prod.getQuantity());
        auditService.log("Production", prod.getId(), "COMPLETED", prod.getOrganizationId(), null,
                "Production completed — qty=" + prod.getQuantity());

        if (prod.getClientOrderId() != null) {
            Orders order = ordersRepository.findById(prod.getClientOrderId()).orElse(null);
            if (order != null) {
                List<String> allProdIds = order.getRelatedProductionIds() != null
                        ? order.getRelatedProductionIds() : List.of(prod.getId());
                boolean allDone = allProdIds.stream()
                        .map(id -> productionRepository.findById(id).orElse(null))
                        .filter(Objects::nonNull)
                        .allMatch(p -> p.getStatus() == ProductionStatus.COMPLETED);

                if (allDone) {
                    for (OrderItem item : order.getItems()) {
                        if (item.getStatus() == OrderItemStatus.IN_PRODUCTION) {
                            int stock = getProductStock(item.getProductId());
                            int toDeduct = Math.min(item.getQuantity(), stock);
                            if (toDeduct > 0) deductProductStock(item, toDeduct, order, user);
                            item.setStatus(OrderItemStatus.READY_FOR_DELIVERY);
                        }
                    }
                    order.setStatus(ClientOrderStatus.READY_FOR_DELIVERY);
                    order.setProductionCompletedAt(LocalDateTime.now());
                    order.setDeliveryReadyAt(LocalDateTime.now());
                    order.setDeliveryToken(NanoIdUtils.randomNanoId());
                    order.setUpdatedAt(LocalDateTime.now());
                    order.setUpdatedBy(user.getEmail());
                    ordersRepository.save(order);

                    notifyClient(order, "Order Ready for Delivery",
                            "Production completed! Order " + order.getOrderReference() + " is ready for delivery.");
                    notifyAdmins(order.getOrganizationId(), "Order Ready for Delivery",
                            "Order " + order.getOrderReference() + " — production done, ready to ship.", "/orders");
                    OrderResponseDto dto = OrdersMapper.toDto(order);
                    realtimeEventService.broadcastOrderStatusChanged(order.getId(), order.getStatus().name(), dto);
                    auditService.log("Order", order.getId(), "PRODUCTION_COMPLETED", order.getOrganizationId(), null,
                            "All production done — order ready for delivery");
                    return dto;
                } else {
                    order.setUpdatedAt(LocalDateTime.now());
                    ordersRepository.save(order);
                    return OrdersMapper.toDto(order);
                }
            }
        }
        return null;
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto deliverOrder(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.READY_FOR_DELIVERY
                && order.getStatus() != ClientOrderStatus.READY) {
            throw new BadRequestException("Order must be READY_FOR_DELIVERY before delivering");
        }
        for (OrderItem item : order.getItems()) {
            item.setStatus(OrderItemStatus.DELIVERED);
        }
        order.setStatus(ClientOrderStatus.DELIVERED);
        order.setDeliveredBy(user.getEmail());
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notifyClient(saved, "Order Delivered", "Your order " + saved.getOrderReference() + " has been delivered!");
        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastDeliveryCompleted(saved.getId(), dto);
        realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
        auditService.log("Order", saved.getId(), "DELIVERED", saved.getOrganizationId(), null,
                "Order delivered by " + user.getEmail());
        return dto;
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto requestDeliveryDate(String orderId, LocalDate proposedDate, String message) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        order.setProposedDeliveryDate(proposedDate);
        order.setAdminMessage(message);
        order.setStatus(ClientOrderStatus.DATE_CHANGE_REQUESTED);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notifyClient(saved, "Delivery Date Change Requested",
                "Admin proposed a new delivery date for order " + saved.getOrderReference() + ": " + proposedDate);
        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderStatusChanged(saved.getId(), saved.getStatus().name(), dto);
        auditService.log("Order", saved.getId(), "DATE_CHANGE_REQUESTED", saved.getOrganizationId(), null,
                "Proposed delivery date: " + proposedDate);
        return dto;
    }


    public MaterialsBreakdownResult getMaterialsBreakdown(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        Map<String, MaterialsBreakdownResult.MaterialLine.MaterialLineBuilder> builders = new LinkedHashMap<>();

        for (OrderItem item : order.getItems()) {
            int productStock = getProductStock(item.getProductId());
            int toProduce = Math.max(0, item.getQuantity() - productStock);
            if (toProduce == 0) continue;

            technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                    .ifPresent(sheet -> {
                        for (MaterialSheetItem si : materialSheetItemRepository.findByTechnicalSheetId(sheet.getId())) {
                            if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                            double needed = round2(si.getQuantityPerUnit() * toProduce);
                            String matId = si.getMaterialId();
                            builders.computeIfAbsent(matId, id -> {
                                int avail = getMaterialStock(id);
                                int reserved = materialStockRepository.findById(id)
                                        .map(ms -> ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0).orElse(0);
                                String name = si.getMaterialName() != null ? si.getMaterialName() : id;
                                String unit  = si.getUnit() != null ? si.getUnit() : "";
                                return MaterialsBreakdownResult.MaterialLine.builder()
                                        .materialId(id).materialName(name).unit(unit)
                                        .availableStock(avail).reservedStock(reserved)
                                        .totalRequired(0).willConsume(0);
                            });
                            builders.get(matId).totalRequired(round2(
                                    builders.get(matId).build().getTotalRequired() + needed));
                            builders.get(matId).willConsume(round2(
                                    builders.get(matId).build().getWillConsume() + needed));
                        }
                    });
        }

        boolean materialsReserved = order.isHasReservations();

        List<MaterialsBreakdownResult.MaterialLine> lines = builders.values().stream().map(b -> {
            MaterialsBreakdownResult.MaterialLine partial = b.build();
            double consume = partial.getWillConsume();
            int avail = partial.getAvailableStock();
            double remaining = round2(avail - consume);
            double shortage  = round2(Math.max(0, consume - avail));
            return MaterialsBreakdownResult.MaterialLine.builder()
                    .materialId(partial.getMaterialId())
                    .materialName(partial.getMaterialName())
                    .unit(partial.getUnit())
                    .totalRequired(partial.getTotalRequired())
                    .availableStock(avail)
                    .reservedStock(partial.getReservedStock())
                    .willConsume(consume)
                    .remainingAfter(remaining)
                    .sufficient(shortage == 0)
                    .shortage(shortage)
                    .alreadyReservedForThisOrder(materialsReserved)
                    .build();
        }).collect(Collectors.toList());

        boolean allSufficient = lines.stream().allMatch(MaterialsBreakdownResult.MaterialLine::isSufficient);

        return MaterialsBreakdownResult.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .materialsReserved(materialsReserved)
                .allSufficient(allSufficient)
                .materials(lines)
                .build();
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto reserveMaterialsForOrder(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        if (order.isHasReservations()) {
            throw new BadRequestException("Materials are already reserved for this order");
        }

        for (OrderItem item : order.getItems()) {
            int productStock = getProductStock(item.getProductId());
            int toProduce = Math.max(0, item.getQuantity() - productStock);
            if (toProduce == 0) continue;

            technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                    .ifPresent(sheet -> {
                        for (MaterialSheetItem si : materialSheetItemRepository.findByTechnicalSheetId(sheet.getId())) {
                            if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                            int toReserve = (int) Math.ceil(si.getQuantityPerUnit() * toProduce);
                            if (toReserve > 0) {
                                materialStockService.reserveMaterial(si.getMaterialId(), toReserve);
                                realtimeEventService.broadcastReservationUpdated(orderId, "ACTIVE");
                            }
                        }
                    });
        }

        order.setHasReservations(true);
        order.setReservedUntil(LocalDateTime.now().plusHours(48));
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "MATERIALS_RESERVED", saved.getOrganizationId(), null,
                "Materials reserved for order " + saved.getOrderReference() + " by " + user.getEmail());
        notifyAdmins(saved.getOrganizationId(), "Materials Reserved",
                "Materials reserved for order " + saved.getOrderReference(), "/orders");

        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderUpdated(dto);
        return dto;
    }


    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto releaseMaterialsForOrder(String orderId) {
        User user = requireAdminOrSubAdmin();
        Orders order = getOrderWithAccess(orderId, user);

        if (!order.isHasReservations()) {
            throw new BadRequestException("No active material reservations found for this order");
        }

        for (OrderItem item : order.getItems()) {
            int productStock = getProductStock(item.getProductId());
            int toProduce = Math.max(0, item.getQuantity() - productStock);
            if (toProduce == 0) continue;

            technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                    .ifPresent(sheet -> {
                        for (MaterialSheetItem si : materialSheetItemRepository.findByTechnicalSheetId(sheet.getId())) {
                            if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                            int toRelease = (int) Math.ceil(si.getQuantityPerUnit() * toProduce);
                            if (toRelease > 0) {
                                materialStockService.releaseMaterial(si.getMaterialId(), toRelease);
                                realtimeEventService.broadcastReservationUpdated(orderId, "RELEASED");
                            }
                        }
                    });
        }

        order.setHasReservations(false);
        order.setReservedUntil(null);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        auditService.log("Order", saved.getId(), "MATERIALS_RELEASED", saved.getOrganizationId(), null,
                "Material reservations released for order " + saved.getOrderReference());

        OrderResponseDto dto = OrdersMapper.toDto(saved);
        realtimeEventService.broadcastOrderUpdated(dto);
        return dto;
    }

    private List<MaterialRequirementInfo> calculateMaterialRequirements(String productId, int qty, String orgId) {
        return technicalSheetRepository.findByProductIdAndStatus(productId, TechnicalSheetStatus.ACTIVE)
                .map(sheet -> {
                    List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                    return sheetItems.stream().map(si -> {
                        double required = (si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0) * qty;
                        int avail = getMaterialStock(si.getMaterialId());
                        return MaterialRequirementInfo.builder()
                                .materialId(si.getMaterialId())
                                .materialName(si.getMaterialName() != null ? si.getMaterialName() : si.getMaterialId())
                                .unit(si.getUnit() != null ? si.getUnit() : "")
                                .requiredQuantity(round2(required))
                                .availableQuantity(avail)
                                .missingQuantity(round2(Math.max(0, required - avail)))
                                .build();
                    }).collect(Collectors.toList());
                }).orElse(List.of());
    }

    private void consumeMaterialsForProduction(String productId, int qty, Orders order, User user) {
        technicalSheetRepository.findByProductIdAndStatus(productId, TechnicalSheetStatus.ACTIVE)
                .ifPresent(sheet -> {
                    for (MaterialSheetItem si : materialSheetItemRepository.findByTechnicalSheetId(sheet.getId())) {
                        if (si.getQuantityPerUnit() == null || si.getQuantityPerUnit() <= 0) continue;
                        int toConsume = (int) Math.ceil(si.getQuantityPerUnit() * qty);
                        materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> {
                            int before = ms.getQuantity() != null ? ms.getQuantity() : 0;
                            int newQty = Math.max(0, before - toConsume);
                            ms.setQuantity(newQty);
                            ms.setLastUpdatedBy(user.getEmail());
                            ms.setUpdatedAt(LocalDateTime.now());
                            materialStockRepository.save(ms);
                            stockMovementService.recordMaterialMovement(MovementType.MATERIAL_DECREASED,
                                    ms.getId(), ms.getName(), ms.getUnit(), toConsume,
                                    before, newQty, order.getId(), null,
                                    order.getOrganizationId(), user.getEmail());
                            realtimeEventService.broadcastMaterialStockUpdated(ms.getId(), newQty, order.getOrganizationId());
                        });
                    }
                });
    }

    private void deductProductStock(OrderItem item, int qty, Orders order, User user) {
        productStockRepository.findByProductId(item.getProductId()).stream().findFirst().ifPresent(ps -> {
            int before = ps.getQuantity() != null ? ps.getQuantity() : 0;
            int newQty = Math.max(0, before - qty);
            ps.setQuantity(newQty);
            ps.setLastUpdatedBy(user.getEmail());
            ps.setUpdatedAt(LocalDateTime.now());
            productStockRepository.save(ps);
            stockMovementService.recordProductMovement(MovementType.PRODUCT_DECREASED,
                    item.getProductId(), item.getProductName(), item.getUnit(),
                    qty, before, newQty, order.getId(), null,
                    order.getOrganizationId(), user.getEmail());
            realtimeEventService.broadcastProductStockUpdated(item.getProductId(), newQty, order.getOrganizationId());
        });
        item.setAllocatedQuantity(qty);
        item.setMissingQuantity(item.getQuantity() - qty);
        item.setStatus(qty >= item.getQuantity() ? OrderItemStatus.AVAILABLE_IN_STOCK : OrderItemStatus.PARTIAL);
    }

    private int getProductStock(String productId) {
        return productStockRepository.findByProductId(productId).stream().findFirst()
                .map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);
    }

    private int getMaterialStock(String materialId) {
        return materialStockRepository.findById(materialId)
                .map(ms -> ms.getQuantity() != null ? ms.getQuantity() : 0).orElse(0);
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private Orders getOrderWithAccess(String orderId, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied to this order");
        return order;
    }

    private User requireAdminOrSubAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Only admins can perform this action");
        return user;
    }

    private void notifyClient(Orders order, String title, String message) {
        notificationService.createNotification(order.getClientId(), title, message,
                NotificationType.ORDER, "/client-orders/" + order.getId());
    }

    private void notifyAdmins(String orgId, String title, String message, String link) {
        userRepository.findByRole(Roles.ADMIN).forEach(u ->
                notificationService.createNotification(u.getId(), title, message, NotificationType.ORDER, link));
        userRepository.findByRole(Roles.SUBADMIN).stream()
                .filter(u -> permissionService.canAccessOrganization(u, orgId))
                .forEach(u -> notificationService.createNotification(u.getId(), title, message, NotificationType.ORDER, link));
    }
}
