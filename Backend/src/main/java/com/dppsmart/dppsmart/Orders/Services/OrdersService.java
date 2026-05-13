package com.dppsmart.dppsmart.Orders.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Orders.DTO.*;
import com.dppsmart.dppsmart.Orders.Entities.*;
import com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.Production.DTO.CreateProductionDto;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomCalculationResultDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomMaterialLineDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrdersService {

    private final OrdersRepository ordersRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final TechnicalSheetModuleService technicalSheetModuleService;
    private final ProductionRepository productionRepository;
    private final StockMovementService stockMovementService;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    // ─── Client: Create Order ─────────────────────────────────────────────────

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto create(CreateOrderDto dto) {
        User user = getCurrentUser();

        String resolvedOrgId;
        if (user.getRole() == Roles.CLIENT) {
            // Try account-linked org first, then fall back to the first org in the system
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
        ClientOrderStatus derivedStatus = ClientOrderStatus.READY_FOR_CONFIRMATION;

        for (OrderItemDto itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + itemDto.getProductId()));

            // Product stock check
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

            // BOM check using active technical sheet
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
                    if (itemStatus == OrderItemStatus.AVAILABLE || itemStatus == OrderItemStatus.PARTIAL) {
                        itemStatus = OrderItemStatus.TO_PRODUCE;
                    }
                }
            } catch (NotFoundException e) {
                // No active BOM — mark as blocked
                overallMaterialsSufficient = false;
                derivedStatus = ClientOrderStatus.BLOCKED_NO_BOM;
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

        // Determine overall order status
        if (derivedStatus != ClientOrderStatus.BLOCKED_NO_BOM) {
            if (!overallMaterialsSufficient) {
                derivedStatus = ClientOrderStatus.BLOCKED_INSUFFICIENT_MATERIALS;
            } else if (items.stream().anyMatch(i -> i.getStatus() == OrderItemStatus.OUT_OF_STOCK)) {
                derivedStatus = ClientOrderStatus.BLOCKED_INSUFFICIENT_STOCK;
            } else {
                derivedStatus = ClientOrderStatus.READY_FOR_CONFIRMATION;
            }
        }

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
        auditService.log("Order", saved.getId(), "CREATE", saved.getOrganizationId(), null,
                "Order created: " + saved.getOrderReference() + " [" + saved.getStatus() + "]");

        notificationService.createNotification(user.getId(), "Order Submitted",
                "Order " + saved.getOrderReference() + " submitted — status: " + saved.getStatus(),
                NotificationType.ORDER, "/client-orders/" + saved.getId());

        notifyAdmins(resolvedOrgId, "New Client Order",
                "Order " + saved.getOrderReference() + " needs review. Status: " + saved.getStatus(),
                "/admin/orders/" + saved.getId());

        return OrdersMapper.toDto(saved);
    }

    // ─── Admin: Confirm Order (triggers production) ────────────────────────────

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

        // Reserve / decrease materials for each item
        for (OrderItem item : order.getItems()) {
            if (item.getRequiredMaterials() != null) {
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
            }

            // Decrease finished product stock if AVAILABLE
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

        // Create production for items that need manufacturing
        List<OrderItem> toProduceItems = order.getItems().stream()
                .filter(i -> i.getStatus() == OrderItemStatus.OUT_OF_STOCK
                        || i.getStatus() == OrderItemStatus.TO_PRODUCE
                        || i.getStatus() == OrderItemStatus.PARTIAL)
                .collect(Collectors.toList());

        String productionId = null;
        if (!toProduceItems.isEmpty()) {
            // Create one production per distinct product
            for (OrderItem item : toProduceItems) {
                Production production = Production.builder()
                        .id(NanoIdUtils.randomNanoId())
                        .productId(item.getProductId())
                        .organizationId(order.getOrganizationId())
                        .quantity(item.getQuantity())
                        .status(ProductionStatus.PLANNED)
                        .steps(Collections.emptyList())
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                Production savedProduction = productionRepository.save(production);
                productionId = savedProduction.getId(); // keep last for linking

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

        return OrdersMapper.toDto(saved);
    }

    // ─── Admin: Propose New Date ──────────────────────────────────────────────

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
        return OrdersMapper.toDto(saved);
    }

    // ─── Mark Ready / Delivered ───────────────────────────────────────────────

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto markReady(String orderId) {
        User user = getCurrentUser();
        requireAdminOrSubAdmin(user);
        Orders order = getOrderAndCheckAccess(orderId, user);

        if (order.getStatus() != ClientOrderStatus.IN_PRODUCTION) {
            throw new BadRequestException("Order must be IN_PRODUCTION to mark as READY");
        }

        order.setStatus(ClientOrderStatus.READY);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        Orders saved = ordersRepository.save(order);

        notificationService.createNotification(saved.getClientId(), "Order Ready",
                "Your order " + saved.getOrderReference() + " is ready for delivery!",
                NotificationType.ORDER, "/client-orders/" + saved.getId());
        auditService.log("Order", saved.getId(), "READY", saved.getOrganizationId(), null,
                "Order marked as ready: " + saved.getOrderReference());
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

        // Record delivery movement
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
        return OrdersMapper.toDto(saved);
    }

    // ─── Client: Accept / Reject proposed date ────────────────────────────────

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
                "/admin/orders/" + saved.getId());
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
                "/admin/orders/" + saved.getId());
        return OrdersMapper.toDto(saved);
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────

    @CacheEvict(value = {"orders", "allOrders"}, allEntries = true)
    public OrderResponseDto cancel(String orderId) {
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
                "Order cancelled: " + saved.getOrderReference());
        notificationService.createNotification(saved.getClientId(), "Order Cancelled",
                "Order " + saved.getOrderReference() + " has been cancelled.",
                NotificationType.ORDER, "/client-orders/" + saved.getId());
        return OrdersMapper.toDto(saved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

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

    // ─── Helpers ──────────────────────────────────────────────────────────────

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
