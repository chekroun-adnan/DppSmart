package com.dppsmart.dppsmart.Production.Services;

import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Notification.Services.RealtimeEventService;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderItemStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.DTO.*;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProductionOrderService {

    @Autowired private ProductionStepEntityRepository stepEntityRepository;
    @Autowired private OrdersRepository ordersRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private TechnicalSheetRepository technicalSheetRepository;
    @Autowired private OperationSheetItemRepository operationSheetItemRepository;
    @Autowired private OperationRepository operationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PermissionService permissionService;
    @Autowired private AuditService auditService;
    @Autowired private NotificationServiceImpl notificationService;
    @Autowired private RealtimeEventService realtimeEventService;

    public List<OrderProductionDto> getProductionOrders() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }

        List<Orders> orders = ordersRepository.findAll().stream()
                .filter(o -> permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .filter(o -> o.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.IN_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.PRODUCTION_COMPLETED)
                .sorted((a, b) -> {
                    int pa = a.getPriority() != null ? a.getPriority() : 0;
                    int pb = b.getPriority() != null ? b.getPriority() : 0;
                    return Integer.compare(pb, pa);
                })
                .collect(Collectors.toList());

        return orders.stream().map(this::toOrderProductionDto).collect(Collectors.toList());
    }

    public OrderProductionDto getOrderProduction(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());
        return toOrderProductionDto(order);
    }

    public List<ProductionStepDto> getSteps(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());

        return stepEntityRepository.findByOrderIdOrderBySequenceOrderAsc(orderId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public GenerateStepsResponse generateSteps(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());

        if (stepEntityRepository.existsByOrderId(orderId)) {
            List<ProductionStepEntity> existing = stepEntityRepository
                    .findByOrderIdOrderBySequenceOrderAsc(orderId);
            GenerateStepsResponse resp = new GenerateStepsResponse();
            resp.setOrderId(orderId);
            resp.setOrderReference(order.getOrderReference());
            resp.setStepsGenerated(0);
            resp.setSteps(existing.stream().map(this::toDto).collect(Collectors.toList()));
            resp.setWarning("Steps already exist for this order. Returning existing steps.");
            return resp;
        }

        List<OrderItem> items = order.getItems() != null ? order.getItems() : List.of();
        List<ProductionStepEntity> allSteps = new ArrayList<>();
        StringBuilder warning = new StringBuilder();
        int seqCounter = 1;

        for (OrderItem item : items) {
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                warning.append("Item ").append(item.getProductName()).append(" has invalid quantity. ");
                continue;
            }

            String productId = item.getProductId();
            if (productId == null || productId.isBlank()) {
                warning.append("Item ").append(item.getProductName()).append(" has no product ID. ");
                continue;
            }

            Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                    .findFirstByProductIdAndStatusOrderByVersionDesc(productId, TechnicalSheetStatus.ACTIVE);
            if (sheetOpt.isEmpty()) {
                warning.append("No active technical sheet for product '")
                        .append(item.getProductName()).append("'. ");
                continue;
            }

            TechnicalSheet sheet = sheetOpt.get();
            List<OperationSheetItem> opItems = operationSheetItemRepository
                    .findByTechnicalSheetIdOrderByStepOrderAsc(sheet.getId());

            if (opItems.isEmpty()) {
                warning.append("No operation items in technical sheet for product '")
                        .append(item.getProductName()).append("'. ");
                continue;
            }

            Set<String> opIds = opItems.stream()
                    .map(OperationSheetItem::getOperationId).collect(Collectors.toSet());
            Map<String, Operation> opMap = operationRepository.findAllById(opIds).stream()
                    .collect(Collectors.toMap(Operation::getId, Function.identity()));

            Product product = productRepository.findById(productId).orElse(null);

            for (OperationSheetItem oi : opItems) {
                Operation op = opMap.get(oi.getOperationId());
                Double durPerUnit = oi.getDurationEstimate() != null
                        ? oi.getDurationEstimate()
                        : (op != null ? op.getDefaultDuration() : null);
                String durUnit = op != null && op.getDurationUnit() != null
                        ? op.getDurationUnit() : "MINUTES";
                int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                double totalDur = durPerUnit != null ? durPerUnit * quantity : 0;

                ProductionStepEntity step = ProductionStepEntity.builder()
                        .orderId(orderId)
                        .orderItemId(item.getProductId())
                        .productId(productId)
                        .productName(item.getProductName() != null ? item.getProductName()
                                : (product != null ? product.getProductName() : null))
                        .operationId(oi.getOperationId())
                        .operationName(oi.getOperationName())
                        .sequenceOrder(seqCounter++)
                        .durationPerUnit(durPerUnit)
                        .durationUnit(durUnit)
                        .orderQuantity(quantity)
                        .totalDuration(totalDur)
                        .totalDurationFormatted(formatDuration(totalDur, durUnit))
                        .responsibleDepartment(op != null ? op.getResponsibleDepartment() : null)
                        .requiredResources(op != null ? op.getRequiredResources() : null)
                        .qualityCheckRequired(oi.getQualityCheckRequired() != null
                                ? oi.getQualityCheckRequired() : false)
                        .canRunInParallel(oi.getCanRunInParallel() != null
                                ? oi.getCanRunInParallel() : false)
                        .instructions(oi.getInstructions())
                        .status(ProductionStepStatus.PENDING)
                        .createdAt(LocalDateTime.now())
                        .build();
                allSteps.add(step);
            }
        }

        if (allSteps.isEmpty()) {
            throw new BadRequestException(
                    "Could not generate any production steps. " + warning.toString().trim());
        }

        stepEntityRepository.saveAll(allSteps);

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        order.setProductionStartedAt(LocalDateTime.now());
        order.setProductionStartedBy(user.getEmail());
        order.setUpdatedAt(LocalDateTime.now());
        ordersRepository.save(order);

        auditService.log("ProductionOrder", orderId, "GENERATE_STEPS", order.getOrganizationId(), null,
                "Generated " + allSteps.size() + " production steps for order " + order.getOrderReference());
        notificationService.createNotification(user.getId(), "Production Started",
                "Production steps generated for order " + order.getOrderReference(),
                NotificationType.PRODUCTION, "/production");

        GenerateStepsResponse resp = new GenerateStepsResponse();
        resp.setOrderId(orderId);
        resp.setOrderReference(order.getOrderReference());
        resp.setStepsGenerated(allSteps.size());
        resp.setSteps(allSteps.stream().map(this::toDto).collect(Collectors.toList()));
        if (warning.length() > 0) {
            resp.setWarning(warning.toString().trim());
        }
        return resp;
    }

    @Transactional
    public ProductionStepDto startStep(String stepId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        ProductionStepEntity step = findStep(stepId);
        Orders order = findOrder(step.getOrderId());
        checkAccess(user, order.getOrganizationId());

        if (step.getStatus() != ProductionStepStatus.PENDING) {
            throw new BadRequestException(
                    "Step '" + step.getOperationName() + "' is " + step.getStatus()
                    + " and cannot be started.");
        }

        if (!canStartStep(step)) {
            throw new BadRequestException(
                    "Cannot start '" + step.getOperationName()
                    + "'. Previous required step must be completed first.");
        }

        step.setStatus(ProductionStepStatus.IN_PROGRESS);
        step.setStartedAt(LocalDateTime.now());
        stepEntityRepository.save(step);

        if (order.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION) {
            order.setStatus(ClientOrderStatus.IN_PRODUCTION);
            order.setProductionStartedAt(LocalDateTime.now());
            order.setProductionStartedBy(user.getEmail());
            order.setUpdatedAt(LocalDateTime.now());
            ordersRepository.save(order);
        }

        auditService.log("ProductionStep", stepId, "START", order.getOrganizationId(), null,
                "Started step " + step.getOperationName() + " for order " + order.getOrderReference());
        return toDto(step);
    }

    @Transactional
    public ProductionStepDto completeStep(String stepId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        ProductionStepEntity step = findStep(stepId);
        Orders order = findOrder(step.getOrderId());
        checkAccess(user, order.getOrganizationId());

        if (step.getStatus() != ProductionStepStatus.IN_PROGRESS) {
            throw new BadRequestException(
                    "Step '" + step.getOperationName() + "' is " + step.getStatus()
                    + " and cannot be completed.");
        }

        step.setStatus(ProductionStepStatus.COMPLETED);
        step.setCompletedAt(LocalDateTime.now());
        step.setCompletedBy(user.getEmail());
        stepEntityRepository.save(step);

        checkAndUpdateOrderProgress(order);

        auditService.log("ProductionStep", stepId, "COMPLETE", order.getOrganizationId(), null,
                "Completed step " + step.getOperationName() + " for order " + order.getOrderReference());
        return toDto(step);
    }

    @Transactional
    public ProductionStepDto blockStep(String stepId, String reason) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        ProductionStepEntity step = findStep(stepId);
        Orders order = findOrder(step.getOrderId());
        checkAccess(user, order.getOrganizationId());

        if (step.getStatus() == ProductionStepStatus.COMPLETED
                || step.getStatus() == ProductionStepStatus.SKIPPED) {
            throw new BadRequestException(
                    "Cannot block a " + step.getStatus().name().toLowerCase() + " step.");
        }

        step.setStatus(ProductionStepStatus.BLOCKED);
        step.setBlockedReason(reason);
        stepEntityRepository.save(step);

        auditService.log("ProductionStep", stepId, "BLOCK", order.getOrganizationId(), null,
                "Blocked step " + step.getOperationName() + ": " + reason);
        return toDto(step);
    }

    @Transactional
    public ProductionStepDto skipStep(String stepId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        ProductionStepEntity step = findStep(stepId);
        Orders order = findOrder(step.getOrderId());
        checkAccess(user, order.getOrganizationId());

        if (step.getStatus() != ProductionStepStatus.PENDING) {
            throw new BadRequestException(
                    "Step '" + step.getOperationName() + "' is " + step.getStatus()
                    + " and cannot be skipped.");
        }

        step.setStatus(ProductionStepStatus.SKIPPED);
        step.setCompletedAt(LocalDateTime.now());
        step.setCompletedBy(user.getEmail());
        stepEntityRepository.save(step);

        checkAndUpdateOrderProgress(order);

        auditService.log("ProductionStep", stepId, "SKIP", order.getOrganizationId(), null,
                "Skipped step " + step.getOperationName() + " for order " + order.getOrderReference());
        return toDto(step);
    }

    private boolean canStartStep(ProductionStepEntity step) {
        if (Boolean.TRUE.equals(step.getCanRunInParallel())) {
            return true;
        }

        List<ProductionStepEntity> allSteps = stepEntityRepository
                .findByOrderIdOrderBySequenceOrderAsc(step.getOrderId());

        int myIdx = -1;
        for (int i = 0; i < allSteps.size(); i++) {
            if (allSteps.get(i).getId().equals(step.getId())) {
                myIdx = i;
                break;
            }
        }

        if (myIdx <= 0) return true;

        for (int i = myIdx - 1; i >= 0; i--) {
            ProductionStepEntity prev = allSteps.get(i);
            if (Boolean.TRUE.equals(prev.getCanRunInParallel())) continue;
            if (Boolean.TRUE.equals(prev.getQualityCheckRequired())) {
                return prev.getStatus() == ProductionStepStatus.COMPLETED;
            }
            if (prev.getStatus() == ProductionStepStatus.PENDING
                    || prev.getStatus() == ProductionStepStatus.IN_PROGRESS) {
                return false;
            }
            if (prev.getStatus() == ProductionStepStatus.SKIPPED) {
                continue;
            }
            if (prev.getStatus() == ProductionStepStatus.COMPLETED) {
                break;
            }
        }

        return true;
    }

    private void checkAndUpdateOrderProgress(Orders order) {
        String orderId = order.getId();
        long total = stepEntityRepository.countByOrderId(orderId);
        long completed = stepEntityRepository.countByOrderIdAndStatus(orderId, ProductionStepStatus.COMPLETED);
        long skipped = stepEntityRepository.countByOrderIdAndStatus(orderId, ProductionStepStatus.SKIPPED);
        long done = completed + skipped;

        order.setUpdatedAt(LocalDateTime.now());
        order.setProductionCompletedAt(done >= total ? LocalDateTime.now() : null);
        order.setStatus(done >= total
                ? ClientOrderStatus.PRODUCTION_COMPLETED
                : ClientOrderStatus.IN_PRODUCTION);
        ordersRepository.save(order);

        if (done >= total) {
            realtimeEventService.broadcastProductionCompleted(
                    orderId, orderId, null, order.getTotalQuantity() != null ? order.getTotalQuantity() : 0);
            auditService.log("ProductionOrder", orderId, "ALL_STEPS_COMPLETED",
                    order.getOrganizationId(), null,
                    "All production steps completed for order " + order.getOrderReference());
        }
    }

    private OrderProductionDto toOrderProductionDto(Orders order) {
        OrderProductionDto dto = new OrderProductionDto();
        dto.setOrderId(order.getId());
        dto.setOrderReference(order.getOrderReference());
        dto.setOrganizationId(order.getOrganizationId());

        organizationRepository.findById(order.getOrganizationId())
                .ifPresent(org -> dto.setOrganizationName(org.getName()));

        int totalQty = order.getTotalQuantity() != null ? order.getTotalQuantity() : 0;
        dto.setTotalQuantity(totalQty);
        dto.setStatus(order.getStatus().name());

        List<OrderItem> items = order.getItems() != null ? order.getItems() : List.of();
        List<OrderProductionItemDto> itemDtos = items.stream().map(item -> {
            OrderProductionItemDto i = new OrderProductionItemDto();
            i.setProductId(item.getProductId());
            i.setProductName(item.getProductName());
            i.setQuantity(item.getQuantity() != null ? item.getQuantity() : 0);
            Optional<TechnicalSheet> sheet = technicalSheetRepository
                    .findFirstByProductIdAndStatusOrderByVersionDesc(item.getProductId(), TechnicalSheetStatus.ACTIVE);
            i.setTechnicalSheetFound(sheet.isPresent() ? "Found" : "Not found");
            return i;
        }).collect(Collectors.toList());
        dto.setItems(itemDtos);

        boolean stepsExist = stepEntityRepository.existsByOrderId(order.getId());
        dto.setStepsGenerated(stepsExist);

        if (stepsExist) {
            long total = stepEntityRepository.countByOrderId(order.getId());
            long completed = stepEntityRepository.countByOrderIdAndStatus(
                    order.getId(), ProductionStepStatus.COMPLETED);
            long skipped = stepEntityRepository.countByOrderIdAndStatus(
                    order.getId(), ProductionStepStatus.SKIPPED);
            long done = completed + skipped;
            dto.setCompletedSteps((int) done);
            dto.setTotalSteps((int) total);
            dto.setProgressPercent(total > 0 ? (int) Math.round(done * 100.0 / total) : 0);

            List<ProductionStepEntity> steps = stepEntityRepository
                    .findByOrderIdOrderBySequenceOrderAsc(order.getId());
            dto.setCurrentOperation(steps.stream()
                    .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS)
                    .findFirst().map(ProductionStepEntity::getOperationName).orElse(null));
            dto.setNextOperation(steps.stream()
                    .filter(s -> s.getStatus() == ProductionStepStatus.PENDING)
                    .findFirst().map(ProductionStepEntity::getOperationName).orElse(null));

            double totalMinutes = steps.stream()
                    .filter(s -> s.getTotalDuration() != null)
                    .mapToDouble(ProductionStepEntity::getTotalDuration).sum();
            dto.setEstimatedCompletionTime(formatDuration(totalMinutes, "MINUTES"));
        } else {
            boolean anyMissing = itemDtos.stream()
                    .anyMatch(i -> "Not found".equals(i.getTechnicalSheetFound()));
            if (anyMissing || items.isEmpty()) {
                dto.setWarning("No operation sheet found for one or more products. "
                        + "Production steps cannot be generated.");
            } else {
                dto.setWarning("Steps not yet generated. Click 'Generate Steps' to start.");
            }
        }

        return dto;
    }

    private ProductionStepDto toDto(ProductionStepEntity entity) {
        if (entity == null) return null;
        ProductionStepDto dto = new ProductionStepDto();
        dto.setId(entity.getId());
        dto.setProductionOrderId(entity.getProductionOrderId());
        dto.setOrderId(entity.getOrderId());
        dto.setOrderItemId(entity.getOrderItemId());
        dto.setProductId(entity.getProductId());
        dto.setProductName(entity.getProductName());
        dto.setOperationId(entity.getOperationId());
        dto.setOperationName(entity.getOperationName());
        dto.setSequenceOrder(entity.getSequenceOrder());
        dto.setDurationPerUnit(entity.getDurationPerUnit());
        dto.setDurationUnit(entity.getDurationUnit());
        dto.setOrderQuantity(entity.getOrderQuantity());
        dto.setTotalDuration(entity.getTotalDuration());
        dto.setTotalDurationFormatted(entity.getTotalDurationFormatted());
        dto.setResponsibleDepartment(entity.getResponsibleDepartment());
        dto.setRequiredResources(entity.getRequiredResources());
        dto.setQualityCheckRequired(entity.getQualityCheckRequired());
        dto.setCanRunInParallel(entity.getCanRunInParallel());
        dto.setInstructions(entity.getInstructions());
        dto.setStatus(entity.getStatus());
        dto.setStartedAt(entity.getStartedAt());
        dto.setCompletedAt(entity.getCompletedAt());
        dto.setBlockedReason(entity.getBlockedReason());
        dto.setCompletedBy(entity.getCompletedBy());
        return dto;
    }

    static String formatDuration(double totalMinutes, String unit) {
        if (totalMinutes <= 0) return "0 min";
        double mins = "HOURS".equalsIgnoreCase(unit) ? totalMinutes * 60 : totalMinutes;
        if (mins < 60) return Math.round(mins) + " min";
        long h = (long) Math.floor(mins / 60);
        long m = Math.round(mins % 60);
        return m > 0 ? h + "h " + m + "m" : h + "h";
    }

    private ProductionStepEntity findStep(String stepId) {
        return stepEntityRepository.findById(stepId)
                .orElseThrow(() -> new NotFoundException("Production step not found: " + stepId));
    }

    private Orders findOrder(String orderId) {
        return ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
    }

    private void checkAccess(User user, String orgId) {
        if (!permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Access denied to this organization");
        }
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
