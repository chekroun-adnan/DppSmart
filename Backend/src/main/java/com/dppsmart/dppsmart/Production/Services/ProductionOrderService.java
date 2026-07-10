package com.dppsmart.dppsmart.Production.Services;

import com.dppsmart.dppsmart.Allocation.Services.ReservationService;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Notification.Services.NotificationEventService;
import com.dppsmart.dppsmart.Notification.Services.RealtimeEventService;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Billing.Services.CostCalculationService;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderItemStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.DTO.*;
import com.dppsmart.dppsmart.Production.Entities.OperationIssue;
import com.dppsmart.dppsmart.Production.Entities.ProductionProgressLog;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import com.dppsmart.dppsmart.Production.Repositories.OperationIssueRepository;
import com.dppsmart.dppsmart.Production.Repositories.ProductionProgressLogRepository;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus;
import com.dppsmart.dppsmart.Expedition.Repositories.ExpeditionRepository;
import com.dppsmart.dppsmart.Expedition.Services.ExpeditionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
    @Autowired private ProductionSchedulingService schedulingService;
    @Autowired private ReservationService reservationService;
    @Autowired private OperationIssueRepository operationIssueRepository;
    @Autowired private ProductionProgressLogRepository productionProgressLogRepository;
    @Autowired private ExpeditionRepository expeditionRepository;
    @Autowired private ExpeditionService expeditionService;
    @Autowired @Lazy private OrdersService ordersService;
    @Autowired @Lazy private com.dppsmart.dppsmart.Billing.Services.InvoiceService invoiceService;


    public List<OrderProductionDto> getProductionOrders() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }

        List<Orders> orders = ordersRepository.findAll().stream()
                .filter(o -> permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .filter(o -> o.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.IN_PRODUCTION)
                .collect(Collectors.toList());

        Map<String, List<ProductionStepEntity>> stepsByOrderId =
                stepEntityRepository.findAll().stream()
                        .filter(s -> orders.stream().anyMatch(o -> o.getId().equals(s.getOrderId())))
                        .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));

        stepsByOrderId.keySet().forEach(this::activatePlannedSteps);

        stepsByOrderId = stepEntityRepository.findAll().stream()
                .filter(s -> orders.stream().anyMatch(o -> o.getId().equals(s.getOrderId())))
                .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));

        boolean anyWipBackfilled = false;
        for (List<ProductionStepEntity> stepList : stepsByOrderId.values()) {
            for (ProductionStepEntity s : stepList) {
                if (ensureWipFields(s)) anyWipBackfilled = true;
            }
            schedulingService.computeForecasts(stepList);
            orders.stream()
                    .filter(o -> o.getId().equals(stepList.get(0).getOrderId()))
                    .findFirst()
                    .ifPresent(order -> schedulingService.computeOrderForecast(stepList, order));
        }
        if (anyWipBackfilled) {
            stepEntityRepository.saveAll(
                    stepsByOrderId.values().stream().flatMap(Collection::stream).collect(Collectors.toList()));
        }

        List<ProductionSchedulingService.ScheduledOrder> schedule =
                schedulingService.computeQueueSchedule(orders, stepsByOrderId);
        Map<String, ProductionSchedulingService.ScheduledOrder> scheduleMap =
                schedule.stream().collect(Collectors.toMap(
                        ProductionSchedulingService.ScheduledOrder::getOrderId, s -> s));

        boolean anyStepsAligned = stepsByOrderId.values().stream()
                .flatMap(Collection::stream)
                .anyMatch(s -> s.getPlannedStartTime() != null);
        if (anyStepsAligned) {
            stepEntityRepository.saveAll(
                    stepsByOrderId.values().stream().flatMap(Collection::stream).collect(Collectors.toList()));
        }

        Map<String, List<ProductionStepEntity>> finalStepsByOrderId = stepsByOrderId;

        orders.forEach(order -> {
            if (order.getDelayStatus() != null || order.getForecastEndDateTime() != null) {
                ordersRepository.save(order);
            }
        });

        for (Orders order : orders) {
            List<ProductionStepEntity> orderSteps = finalStepsByOrderId.getOrDefault(order.getId(), List.of());
            order.setPriorityScore(schedulingService.computePriorityScore(order, orderSteps));
        }

        return orders.stream()
                .map(o -> toOrderProductionDto(o, scheduleMap.get(o.getId()),
                        finalStepsByOrderId.getOrDefault(o.getId(), List.of())))
                .collect(Collectors.toList());
    }

    public OrderProductionDto getOrderProduction(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());

        List<Orders> allOrders = ordersRepository.findAll().stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.IN_PRODUCTION)
                .collect(Collectors.toList());

        Map<String, List<ProductionStepEntity>> stepsByOrderId =
                stepEntityRepository.findAll().stream()
                        .filter(s -> allOrders.stream().anyMatch(o -> o.getId().equals(s.getOrderId())))
                        .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));

        stepsByOrderId.keySet().forEach(this::activatePlannedSteps);

        stepsByOrderId = stepEntityRepository.findAll().stream()
                .filter(s -> allOrders.stream().anyMatch(o -> o.getId().equals(s.getOrderId())))
                .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));

        boolean anyWipBackfilled = false;
        for (List<ProductionStepEntity> stepList : stepsByOrderId.values()) {
            for (ProductionStepEntity s : stepList) {
                if (ensureWipFields(s)) anyWipBackfilled = true;
            }
            schedulingService.computeForecasts(stepList);
            allOrders.stream()
                    .filter(o -> o.getId().equals(stepList.get(0).getOrderId()))
                    .findFirst()
                    .ifPresent(o -> schedulingService.computeOrderForecast(stepList, o));
        }
        if (anyWipBackfilled) {
            stepEntityRepository.saveAll(
                    stepsByOrderId.values().stream().flatMap(Collection::stream).collect(Collectors.toList()));
        }

        List<ProductionSchedulingService.ScheduledOrder> schedule =
                schedulingService.computeQueueSchedule(allOrders, stepsByOrderId);

        ProductionSchedulingService.ScheduledOrder scheduled = schedule.stream()
                .filter(s -> s.getOrderId().equals(orderId))
                .findFirst().orElse(null);

        order.setPriorityScore(schedulingService.computePriorityScore(order,
                stepsByOrderId.getOrDefault(orderId, List.of())));

        return toOrderProductionDto(order, scheduled, stepsByOrderId.getOrDefault(orderId, List.of()));
    }

    public List<ProductionStepDto> getSteps(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());

        activatePlannedSteps(orderId);
        List<ProductionStepEntity> steps = stepEntityRepository
                .findByOrderIdOrderBySequenceOrderAsc(orderId);
        alignStepsForOrderInQueue(orderId, steps);

        boolean anyBackfilled = false;
        for (ProductionStepEntity s : steps) {
            if (ensureWipFields(s)) anyBackfilled = true;
        }
        if (anyBackfilled) {
            stepEntityRepository.saveAll(steps);
        }

        schedulingService.computeForecasts(steps);
        stepEntityRepository.saveAll(steps);

        return steps.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public GenerateStepsResponse generateSteps(String orderId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("Access denied");
        }
        Orders order = findOrder(orderId);
        checkAccess(user, order.getOrganizationId());

        ordersService.freezeCostSnapshots(order);
        ordersRepository.save(order);

        if (stepEntityRepository.existsByOrderId(orderId)) {
            List<ProductionStepEntity> existing = stepEntityRepository
                    .findByOrderIdOrderBySequenceOrderAsc(orderId);
            alignStepsForOrderInQueue(orderId, existing);
            schedulingService.computeForecasts(existing);
            stepEntityRepository.saveAll(existing);
            GenerateStepsResponse resp = new GenerateStepsResponse();
            resp.setOrderId(orderId);
            resp.setOrderReference(order.getOrderReference());
            resp.setStepsGenerated(0);
            resp.setSteps(existing.stream().map(this::toDto).collect(Collectors.toList()));
            resp.setWarning("Steps already exist for this order. Returning existing steps.");
            return resp;
        }

        Map<String, List<ProductionStepEntity>> existingStepsByOrder =
                stepEntityRepository.findAll().stream()
                        .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));
        List<Orders> allProdOrders = ordersRepository.findAll().stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.IN_PRODUCTION)
                .collect(Collectors.toList());

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
                    .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(productId, TechnicalSheetType.OPERATION_SHEET, TechnicalSheetStatus.ACTIVE);
            if (sheetOpt.isEmpty()) {
                warning.append("No active operation sheet for product '")
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
                double durationMinutes = CostCalculationService.resolveDurationMinutes(oi, op);
                String durUnit = "MINUTES";
                int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                double totalDur = durationMinutes * quantity;

                Double costPerMinute = op != null && op.getCostPerMinute() != null ? op.getCostPerMinute() : 0.0;
                double rate = costPerMinute != null ? costPerMinute : 0.0;
                double costPerUnitVal = durationMinutes * rate;
                double totalCost = totalDur * rate;

                ProductionStepEntity step = ProductionStepEntity.builder()
                        .orderId(orderId)
                        .orderItemId(item.getProductId())
                        .productId(productId)
                        .productName(item.getProductName() != null ? item.getProductName()
                                : (product != null ? product.getProductName() : null))
                        .operationId(oi.getOperationId())
                        .operationName(oi.getOperationName())
                        .sequenceOrder(seqCounter++)
                        .durationPerUnit(durationMinutes)
                        .durationUnit(durUnit)
                        .orderQuantity(quantity)
                        .totalDuration(totalDur)
                        .totalDurationFormatted(formatDuration(totalDur, durUnit))
                        .responsibleDepartment(oi.getAssignedDepartment() != null
                                ? oi.getAssignedDepartment()
                                : (op != null ? op.getResponsibleDepartment() : null))
                        .requiredResources(op != null ? op.getRequiredResources() : null)
                        .qualityCheckRequired(oi.getQualityCheckRequired() != null
                                ? oi.getQualityCheckRequired() : false)
                        .canRunInParallel(oi.getCanRunInParallel() != null
                                ? oi.getCanRunInParallel() : false)
                        .instructions(oi.getInstructions())
                        .status(ProductionStepStatus.PLANNED)
                        .healthScore(100)
                        .delayStatus(ProductionSchedulingService.ON_SCHEDULE)
                        .createdAt(LocalDateTime.now())
                        .requiredQuantity(quantity)
                        .completedQuantity(0)
                        .remainingQuantity(quantity)
                        .completionPercentage(0.0)
                        .plannedDurationMinutes((int) Math.ceil(totalDur))
                        .actualDurationMinutes(0)
                        .remainingDurationMinutes((int) Math.ceil(totalDur))
                        .executionCostPerUnit(costPerUnitVal)
                        .totalExecutionCost(totalCost)
                        .build();
                allSteps.add(step);
            }
        }

        if (allSteps.isEmpty()) {
            throw new BadRequestException(
                    "Could not generate any production steps. " + warning.toString().trim());
        }

        schedulingService.scheduleNewOrderSteps(allSteps, existingStepsByOrder, allProdOrders);
        schedulingService.computeForecasts(allSteps);
        List<ProductionStepEntity> allAligned = existingStepsByOrder.values().stream()
                .flatMap(Collection::stream).collect(Collectors.toList());
        allAligned.addAll(allSteps);
        stepEntityRepository.saveAll(allAligned);

        activatePlannedSteps(orderId);
        reservationService.consumeMaterialReservations(orderId);

        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        if (order.getProductionStartedAt() == null) {
            order.setProductionStartedAt(LocalDateTime.now());
        }
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

        if (step.getStatus() != ProductionStepStatus.READY) {
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

        if (step.getCompletedQuantity() == null) step.setCompletedQuantity(0);
        if (step.getRequiredQuantity() == null) step.setRequiredQuantity(step.getOrderQuantity());
        if (step.getRemainingQuantity() == null) {
            step.setRemainingQuantity(step.getRequiredQuantity() != null ? step.getRequiredQuantity() : step.getOrderQuantity());
        }
        if (step.getCompletionPercentage() == null) step.setCompletionPercentage(0.0);
        if (step.getPlannedDurationMinutes() == null && step.getDurationPerUnit() != null && step.getRequiredQuantity() != null) {
            step.setPlannedDurationMinutes((int) Math.ceil(step.getDurationPerUnit() * step.getRequiredQuantity()));
        }
        step.setActualDurationMinutes(0);
        if (step.getRemainingDurationMinutes() == null && step.getPlannedDurationMinutes() != null) {
            step.setRemainingDurationMinutes(step.getPlannedDurationMinutes());
        }

        List<ProductionStepEntity> allSteps = stepEntityRepository.findByOrderIdOrderBySequenceOrderAsc(step.getOrderId());
        int maxSeq = allSteps.stream()
                .filter(s -> s.getSequenceOrder() != null)
                .mapToInt(ProductionStepEntity::getSequenceOrder)
                .max().orElse(-1);
        if (maxSeq >= 0 && step.getSequenceOrder() != null && step.getSequenceOrder() == maxSeq) {
            try {
                expeditionRepository.findByOrderId(step.getOrderId()).ifPresentOrElse(exp -> {
                    if (exp.getStatus() == ExpeditionStatus.PREPARING) {
                        exp.setStatus(ExpeditionStatus.PACKING);
                        exp.setUpdatedAt(LocalDateTime.now());
                        expeditionRepository.save(exp);
                        log.info("Expedition {} set to PACKING for order {}", exp.getId(), step.getOrderId());
                    } else {
                        log.info("Expedition already in status {} for order {}", exp.getStatus(), step.getOrderId());
                    }
                }, () -> {
                    User systemUser = userRepository.findByEmail("system@dppsmart.com")
                            .orElse(user);
                    var expDto = expeditionService.createExpedition(step.getOrderId(), systemUser);
                    log.info("Expedition {} auto-created for order {} (last step: {})", expDto.getId(), step.getOrderId(), step.getOperationName());
                });
            } catch (Exception e) {
                log.error("Failed to auto-create expedition for order {}: {}", step.getOrderId(), e.getMessage(), e);
            }
        } else {
            log.debug("Step {} (seq={}) is not the last step (maxSeq={}), skipping expedition creation",
                    step.getOperationName(), step.getSequenceOrder(), maxSeq);
        }

        stepEntityRepository.save(step);

        saveProgressLog(step, "STARTED", 0, user);

        schedulingService.computeForecast(step, LocalDateTime.now());
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

        LocalDateTime completedAt = LocalDateTime.now();
        step.setStatus(ProductionStepStatus.COMPLETED);
        step.setCompletedAt(completedAt);
        step.setCompletedBy(user.getEmail());
        step.setActualDuration((double) ChronoUnit.MINUTES.between(step.getStartedAt(), completedAt));

        Integer required = step.getRequiredQuantity() != null ? step.getRequiredQuantity() : step.getOrderQuantity();
        step.setCompletedQuantity(required);
        step.setRemainingQuantity(0);
        step.setCompletionPercentage(100.0);
        if (step.getStartedAt() != null && completedAt != null) {
            int actualMins = (int) ChronoUnit.MINUTES.between(step.getStartedAt(), completedAt);
            step.setActualDurationMinutes(actualMins);
            step.setRemainingDurationMinutes(0);
        }

        if (step.getExecutionCostPerUnit() != null) {
            step.setTotalExecutionCost(step.getExecutionCostPerUnit() * required);
        }

        stepEntityRepository.save(step);

        saveProgressLog(step, "COMPLETED", step.getCompletedQuantity(), user);

        schedulingService.computeForecast(step, completedAt);
        stepEntityRepository.save(step);

        if (step.getDelayMinutes() != null && step.getDelayMinutes() > 30) {
            String delayMsg = String.format("Step '%s' completed with %.0f min delay",
                    step.getOperationName(), step.getDelayMinutes());
            notificationService.createNotification(user.getId(), "Step Delayed",
                    delayMsg, NotificationType.PRODUCTION, "/production/steps/" + stepId);
        }

        if (step.getPlannedEndTime() != null && completedAt.isAfter(step.getPlannedEndTime())) {
            rescheduleSubsequentSteps(step.getOrderId(), step.getSequenceOrder(), completedAt);
        }

        List<ProductionStepEntity> allOrderSteps = stepEntityRepository
                .findByOrderIdOrderBySequenceOrderAsc(step.getOrderId());
        schedulingService.computeForecasts(allOrderSteps);
        stepEntityRepository.saveAll(allOrderSteps);

        activatePlannedSteps(step.getOrderId());

        checkAndUpdateOrderProgress(order);

        accumulateOrderProductionCost(order, allOrderSteps);

        schedulingService.computeOrderForecast(allOrderSteps, order);
        ordersRepository.save(order);

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

        schedulingService.computeForecast(step, LocalDateTime.now());
        stepEntityRepository.save(step);

        String blockMsg = String.format("Step '%s' blocked: %s", step.getOperationName(), reason);
        notificationService.createNotification(user.getId(), "Step Blocked",
                blockMsg, NotificationType.PRODUCTION, "/production/steps/" + stepId);

        if (ProductionSchedulingService.DELAYED.equals(step.getDelayStatus())) {
            String delayMsg = String.format("Order %s delayed due to blocked step '%s'",
                    order.getOrderReference(), step.getOperationName());
            notificationService.createNotification(user.getId(), "Order Delayed",
                    delayMsg, NotificationType.PRODUCTION, "/production/orders/" + order.getId());
        }

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

        if (step.getStatus() != ProductionStepStatus.PLANNED
                && step.getStatus() != ProductionStepStatus.READY) {
            throw new BadRequestException(
                    "Step '" + step.getOperationName() + "' is " + step.getStatus()
                    + " and cannot be skipped.");
        }

        step.setStatus(ProductionStepStatus.SKIPPED);
        step.setCompletedAt(LocalDateTime.now());
        step.setCompletedBy(user.getEmail());
        stepEntityRepository.save(step);

        schedulingService.computeForecast(step, LocalDateTime.now());
        stepEntityRepository.save(step);

        activatePlannedSteps(step.getOrderId());
        checkAndUpdateOrderProgress(order);

        auditService.log("ProductionStep", stepId, "SKIP", order.getOrganizationId(), null,
                "Skipped step " + step.getOperationName() + " for order " + order.getOrderReference());
        return toDto(step);
    }


    public OperationIssueDto createIssue(String stepId, String issueType, String title,
                                          String description, User user) {
        ProductionStepEntity step = findStep(stepId);
        OperationIssue issue = OperationIssue.builder()
                .stepId(stepId)
                .orderId(step.getOrderId())
                .issueType(issueType)
                .title(title)
                .description(description)
                .createdBy(user.getId())
                .createdByName(user.getName() != null ? user.getName() : user.getEmail())
                .createdAt(LocalDateTime.now())
                .resolved(false)
                .build();
        issue = operationIssueRepository.save(issue);

        notificationService.createNotification(user.getId(), "Issue Created",
                "Issue: " + title, NotificationType.PRODUCTION, "/production/issues/" + issue.getId());

        return toIssueDto(issue);
    }

    public OperationIssueDto resolveIssue(String issueId, User user) {
        OperationIssue issue = operationIssueRepository.findById(issueId)
                .orElseThrow(() -> new NotFoundException("Issue not found: " + issueId));
        issue.setResolved(true);
        issue.setResolvedBy(user.getId());
        issue                .setResolvedByName(user.getName() != null ? user.getName() : user.getEmail());
        issue.setResolvedAt(LocalDateTime.now());
        issue = operationIssueRepository.save(issue);

        notificationService.createNotification(user.getId(), "Issue Resolved",
                "Issue resolved: " + issue.getTitle(),
                NotificationType.PRODUCTION, "/production/issues/" + issue.getId());

        return toIssueDto(issue);
    }

    public List<OperationIssueDto> getStepIssues(String stepId) {
        return operationIssueRepository.findByStepIdOrderByCreatedAtDesc(stepId).stream()
                .map(this::toIssueDto).collect(Collectors.toList());
    }


    @Transactional
    public ProductionStepDto reportProgress(String stepId, Integer quantity, String notes, boolean markComplete, User user) {
        ProductionStepEntity step = findStep(stepId);
        Orders order = findOrder(step.getOrderId());
        checkAccess(user, order.getOrganizationId());

        if (step.getStatus() != ProductionStepStatus.IN_PROGRESS) {
            throw new BadRequestException(
                    "Step '" + step.getOperationName() + "' is " + step.getStatus()
                    + " and cannot report progress. Must be IN_PROGRESS.");
        }

        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Reported quantity must be positive.");
        }

        Integer required = step.getRequiredQuantity() != null ? step.getRequiredQuantity() : step.getOrderQuantity();
        if (required == null || required <= 0) {
            throw new BadRequestException("Step has no defined required quantity.");
        }

        int currentCompleted = step.getCompletedQuantity() != null ? step.getCompletedQuantity() : 0;
        int newCompleted = currentCompleted + quantity;

        if (newCompleted > required) {
            throw new BadRequestException(
                    "Reported quantity " + quantity + " would exceed required quantity " + required
                    + ". Already completed: " + currentCompleted);
        }

        int remaining = required - newCompleted;
        double pct = (double) newCompleted / required * 100;

        step.setCompletedQuantity(newCompleted);
        step.setRemainingQuantity(remaining);
        step.setCompletionPercentage(pct);

        if (step.getStartedAt() != null) {
            int actualMins = (int) ChronoUnit.MINUTES.between(step.getStartedAt(), LocalDateTime.now());
            step.setActualDurationMinutes(actualMins);
        }

        if (step.getDurationPerUnit() != null && remaining > 0) {
            double remainingMins = remaining * step.getDurationPerUnit();
            if ("HOURS".equalsIgnoreCase(step.getDurationUnit())) {
                remainingMins *= 60;
            }
            step.setRemainingDurationMinutes((int) Math.ceil(remainingMins));
        } else {
            step.setRemainingDurationMinutes(0);
        }

        if (step.getExecutionCostPerUnit() != null) {
            step.setTotalExecutionCost(step.getExecutionCostPerUnit() * newCompleted);
        }

        boolean shouldComplete = remaining <= 0 || markComplete;
        if (shouldComplete) {
            step.setStatus(ProductionStepStatus.COMPLETED);
            step.setCompletedAt(LocalDateTime.now());
            step.setCompletedBy(user.getEmail());
            step.setCompletionPercentage(100.0);
            step.setRemainingQuantity(0);
            if (step.getStartedAt() != null) {
                step.setActualDuration((double) ChronoUnit.MINUTES.between(step.getStartedAt(), step.getCompletedAt()));
            }
        }

        stepEntityRepository.save(step);

        saveProgressLog(step, shouldComplete ? "COMPLETED" : "PROGRESS", quantity, user);

        schedulingService.computeForecast(step, LocalDateTime.now());
        stepEntityRepository.save(step);

        if (shouldComplete) {
            if (step.getPlannedEndTime() != null && step.getCompletedAt() != null
                    && step.getCompletedAt().isAfter(step.getPlannedEndTime())) {
                rescheduleSubsequentSteps(step.getOrderId(), step.getSequenceOrder(), step.getCompletedAt());
            }

            List<ProductionStepEntity> allOrderSteps = stepEntityRepository
                    .findByOrderIdOrderBySequenceOrderAsc(step.getOrderId());
            schedulingService.computeForecasts(allOrderSteps);
            stepEntityRepository.saveAll(allOrderSteps);

            activatePlannedSteps(step.getOrderId());
            checkAndUpdateOrderProgress(order);

            accumulateOrderProductionCost(order, allOrderSteps);

            schedulingService.computeOrderForecast(allOrderSteps, order);
            ordersRepository.save(order);
        } else {
            List<ProductionStepEntity> allOrderSteps = stepEntityRepository
                    .findByOrderIdOrderBySequenceOrderAsc(step.getOrderId());
            schedulingService.computeForecasts(allOrderSteps);
            activatePlannedSteps(step.getOrderId());

            accumulateOrderProductionCost(order, allOrderSteps);

            schedulingService.computeOrderForecast(allOrderSteps, order);
            ordersRepository.save(order);
        }

        return toDto(step);
    }

    public List<ProgressLogDto> getProgressHistory(String stepId) {
        return productionProgressLogRepository.findByStepIdOrderByTimestampAsc(stepId).stream()
                .map(this::toProgressLogDto).collect(Collectors.toList());
    }

    private void saveProgressLog(ProductionStepEntity step, String action, Integer reportedQuantity, User user) {
        ProductionProgressLog log = ProductionProgressLog.builder()
                .stepId(step.getId())
                .orderId(step.getOrderId())
                .department(step.getResponsibleDepartment())
                .action(action)
                .reportedQuantity(reportedQuantity)
                .completedQuantity(step.getCompletedQuantity())
                .remainingQuantity(step.getRemainingQuantity())
                .completionPercentage(step.getCompletionPercentage())
                .reportedBy(user.getEmail())
                .reportedByName(user.getName() != null ? user.getName() : user.getEmail())
                .timestamp(LocalDateTime.now())
                .build();
        productionProgressLogRepository.save(log);
    }

    private ProgressLogDto toProgressLogDto(ProductionProgressLog log) {
        if (log == null) return null;
        ProgressLogDto dto = new ProgressLogDto();
        dto.setId(log.getId());
        dto.setStepId(log.getStepId());
        dto.setOrderId(log.getOrderId());
        dto.setDepartment(log.getDepartment());
        dto.setAction(log.getAction());
        dto.setReportedQuantity(log.getReportedQuantity());
        dto.setCompletedQuantity(log.getCompletedQuantity());
        dto.setRemainingQuantity(log.getRemainingQuantity());
        dto.setCompletionPercentage(log.getCompletionPercentage());
        dto.setReportedBy(log.getReportedBy());
        dto.setReportedByName(log.getReportedByName());
        dto.setTimestamp(log.getTimestamp());
        dto.setNotes(log.getNotes());
        return dto;
    }


    public List<DepartmentQueueDto> getDepartmentQueues(String department) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) throw new ForbiddenException("Access denied");

        LocalDateTime now = LocalDateTime.now();
        List<Orders> accessibleOrders = ordersRepository.findAll().stream()
                .filter(o -> user.getRole() == Roles.ADMIN
                        || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .collect(Collectors.toList());
        Set<String> accessibleOrderIds = accessibleOrders.stream()
                .map(Orders::getId).collect(Collectors.toSet());
        Map<String, Orders> orderMap = accessibleOrders.stream()
                .collect(Collectors.toMap(Orders::getId, o -> o));

        List<ProductionStepEntity> allSteps = stepEntityRepository.findAll().stream()
                .filter(s -> accessibleOrderIds.contains(s.getOrderId()))
                .collect(Collectors.toList());

        boolean anyWipBackfilled = false;
        for (ProductionStepEntity s : allSteps) {
            if (ensureWipFields(s)) anyWipBackfilled = true;
        }
        if (anyWipBackfilled) {
            stepEntityRepository.saveAll(allSteps);
        }

        schedulingService.computeForecasts(allSteps);

        Map<String, List<ProductionStepEntity>> byDept = allSteps.stream()
                .filter(s -> s.getResponsibleDepartment() != null)
                .collect(Collectors.groupingBy(ProductionStepEntity::getResponsibleDepartment));

        List<DepartmentQueueDto> queues = new ArrayList<>();
        for (Map.Entry<String, List<ProductionStepEntity>> entry : byDept.entrySet()) {
            if (department != null && !department.equalsIgnoreCase(entry.getKey())) continue;

            List<ProductionStepEntity> deptSteps = entry.getValue();
            List<DepartmentQueueDto.DepartmentOperation> todayOps = new ArrayList<>();
            List<DepartmentQueueDto.DepartmentOperation> upcomingOps = new ArrayList<>();
            List<DepartmentQueueDto.DepartmentOperation> delayedOps = new ArrayList<>();

            for (ProductionStepEntity step : deptSteps) {
                DepartmentQueueDto.DepartmentOperation op = toDepartmentOperation(step, orderMap.get(step.getOrderId()));
                if (ProductionSchedulingService.DELAYED.equals(step.getDelayStatus())) {
                    delayedOps.add(op);
                } else if (step.getPlannedStartTime() != null
                        && step.getPlannedStartTime().toLocalDate().equals(now.toLocalDate())) {
                    todayOps.add(op);
                } else {
                    upcomingOps.add(op);
                }
            }

            Comparator<DepartmentQueueDto.DepartmentOperation> sortByCarryOver =
                    Comparator.<DepartmentQueueDto.DepartmentOperation, Boolean>comparing(
                            op -> op.getStatus() == ProductionStepStatus.IN_PROGRESS
                                    && op.getRemainingQuantity() != null && op.getRemainingQuantity() > 0,
                            Comparator.reverseOrder());
            Comparator<DepartmentQueueDto.DepartmentOperation> sortByOverdue =
                    Comparator.comparing(DepartmentQueueDto.DepartmentOperation::isOverdue).reversed();
            Comparator<DepartmentQueueDto.DepartmentOperation> sortByPriority =
                    Comparator.comparingInt(DepartmentQueueDto.DepartmentOperation::getPriorityScore).reversed();

            todayOps.sort(sortByCarryOver.thenComparing(sortByOverdue).thenComparing(sortByPriority));
            upcomingOps.sort(sortByCarryOver.thenComparing(sortByOverdue).thenComparing(sortByPriority));
            delayedOps.sort(sortByCarryOver.thenComparing(sortByOverdue).thenComparing(sortByPriority));

            double assignedMinutes = deptSteps.stream()
                    .filter(s -> s.getPlannedStartTime() != null && s.getPlannedEndTime() != null)
                    .filter(s -> s.getPlannedStartTime().toLocalDate().equals(now.toLocalDate())
                            || s.getPlannedEndTime().toLocalDate().equals(now.toLocalDate()))
                    .mapToDouble(s -> Math.abs(ChronoUnit.MINUTES.between(
                            s.getPlannedStartTime(), s.getPlannedEndTime())))
                    .sum();

            double assignedHours = assignedMinutes / 60.0;
            double availableHours = 8.0;
            double utilizationPercent = availableHours > 0
                    ? Math.round(assignedHours / availableHours * 100) : 0;

            queues.add(DepartmentQueueDto.builder()
                    .department(entry.getKey())
                    .todayOperations(todayOps)
                    .upcomingOperations(upcomingOps)
                    .delayedOperations(delayedOps)
                    .availableHours(availableHours)
                    .assignedHours(assignedHours)
                    .utilizationPercent(utilizationPercent)
                    .capacityStatus(utilizationPercent > 100 ? "OVERLOADED"
                            : utilizationPercent < 50 ? "UNDERUTILIZED" : "NORMAL")
                    .build());
        }

        return queues;
    }


    public KpiDashboardDto getKpiDashboard() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) throw new ForbiddenException("Access denied");

        List<Orders> accessibleOrders = ordersRepository.findAll().stream()
                .filter(o -> user.getRole() == Roles.ADMIN
                        || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .collect(Collectors.toList());

        List<ProductionStepEntity> allSteps = stepEntityRepository.findAll().stream()
                .filter(s -> accessibleOrders.stream().anyMatch(o -> o.getId().equals(s.getOrderId())))
                .collect(Collectors.toList());

        boolean anyWipBackfilled = false;
        for (ProductionStepEntity s : allSteps) {
            if (ensureWipFields(s)) anyWipBackfilled = true;
        }
        if (anyWipBackfilled) {
            stepEntityRepository.saveAll(allSteps);
        }

        schedulingService.computeForecasts(allSteps);

        long ordersInProduction = accessibleOrders.stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.IN_PRODUCTION).count();
        long readyForDelivery = accessibleOrders.stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.PRODUCTION_COMPLETED).count();
        long delayedOrders = accessibleOrders.stream()
                .filter(o -> ProductionSchedulingService.DELAYED.equals(o.getDelayStatus())).count();

        long activeOps = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS).count();
        long delayedOps = allSteps.stream()
                .filter(s -> ProductionSchedulingService.DELAYED.equals(s.getDelayStatus())).count();

        long completedOps = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.COMPLETED).count();
        long onTimeOps = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.COMPLETED
                        && s.getDelayMinutes() != null && s.getDelayMinutes() <= 0).count();
        double onTimeRate = completedOps > 0 ? Math.round((double) onTimeOps / completedOps * 100) : 100;

        double avgDuration = allSteps.stream()
                .filter(s -> s.getActualDuration() != null)
                .mapToDouble(ProductionStepEntity::getActualDuration)
                .average().orElse(0);

        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        long todayWorkload = allSteps.stream()
                .filter(s -> s.getPlannedStartTime() != null
                        && !s.getPlannedStartTime().isBefore(todayStart)
                        && !s.getPlannedStartTime().isAfter(todayEnd))
                .count();

        List<ProductionSchedulingService.DepartmentCapacity> deptCapacities =
                schedulingService.computeDepartmentCapacities(allSteps, null);

        long wipOrders = accessibleOrders.stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.IN_PRODUCTION).count();
        long wipOperations = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS).count();
        int totalRemainingQty = allSteps.stream()
                .filter(s -> s.getRemainingQuantity() != null)
                .mapToInt(ProductionStepEntity::getRemainingQuantity).sum();
        double avgCompletionPct = allSteps.stream()
                .filter(s -> s.getCompletionPercentage() != null && s.getRequiredQuantity() != null && s.getRequiredQuantity() > 0)
                .mapToDouble(ProductionStepEntity::getCompletionPercentage)
                .average().orElse(0);
        long carriedFromPrev = allSteps.stream()
                .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS
                        && s.getStartedAt() != null
                        && s.getStartedAt().toLocalDate().isBefore(LocalDateTime.now().toLocalDate()))
                .count();

        double efficiency = 0;
        long completedWithDuration = allSteps.stream()
                .filter(s -> s.getPlannedDurationMinutes() != null && s.getActualDurationMinutes() != null
                        && s.getPlannedDurationMinutes() > 0 && s.getActualDurationMinutes() > 0)
                .count();
        if (completedWithDuration > 0) {
            double totalPlanned = allSteps.stream()
                    .filter(s -> s.getPlannedDurationMinutes() != null && s.getActualDurationMinutes() != null
                            && s.getPlannedDurationMinutes() > 0 && s.getActualDurationMinutes() > 0)
                    .mapToInt(ProductionStepEntity::getPlannedDurationMinutes).sum();
            double totalActual = allSteps.stream()
                    .filter(s -> s.getPlannedDurationMinutes() != null && s.getActualDurationMinutes() != null
                            && s.getPlannedDurationMinutes() > 0 && s.getActualDurationMinutes() > 0)
                    .mapToInt(ProductionStepEntity::getActualDurationMinutes).sum();
            efficiency = totalPlanned > 0 ? Math.round(totalPlanned / totalActual * 100) : 0;
        }

        KpiDashboardDto dto = new KpiDashboardDto();
        dto.setOrdersInProduction((int) ordersInProduction);
        dto.setOperationsActive((int) activeOps);
        dto.setDelayedOrders((int) delayedOrders);
        dto.setDelayedOperations((int) delayedOps);
        dto.setReadyForDelivery((int) readyForDelivery);
        dto.setOnTimeCompletionRate((int) onTimeRate);
        dto.setAverageProductionDurationMinutes(avgDuration);
        dto.setTodayWorkload((int) todayWorkload);
        dto.setDepartmentCapacities(deptCapacities);

        dto.setWipOrders((int) wipOrders);
        dto.setWipOperations((int) wipOperations);
        dto.setTotalRemainingQuantity(totalRemainingQty);
        dto.setAverageCompletionPercentage(avgCompletionPct);
        dto.setOperationsCarriedFromPreviousDays((int) carriedFromPrev);
        dto.setProductionEfficiency(efficiency);

        return dto;
    }


    @Transactional
    public int backfillWipFields() {
        List<ProductionStepEntity> allSteps = stepEntityRepository.findAll();
        int updated = 0;
        for (ProductionStepEntity step : allSteps) {
            if (ensureWipFields(step)) {
                stepEntityRepository.save(step);
                updated++;
            }
        }
        log.info("Backfilled WIP fields for {} existing production steps", updated);
        return updated;
    }

    public boolean ensureWipFields(ProductionStepEntity step) {
        if (step == null) return false;
        boolean changed = false;

        Integer required = step.getRequiredQuantity();
        if (required == null) {
            required = step.getOrderQuantity() != null ? step.getOrderQuantity() : 0;
            step.setRequiredQuantity(required);
            changed = true;
        }

        Integer completed = step.getCompletedQuantity();
        if (completed == null) {
            if (step.getStatus() == ProductionStepStatus.COMPLETED) {
                completed = required;
            } else {
                completed = 0;
            }
            step.setCompletedQuantity(completed);
            changed = true;
        }

        Integer remaining = step.getRemainingQuantity();
        if (remaining == null) {
            remaining = Math.max(0, required - completed);
            step.setRemainingQuantity(remaining);
            changed = true;
        }

        Double pct = step.getCompletionPercentage();
        if (pct == null) {
            pct = required > 0 ? (double) completed / required * 100 : 0.0;
            step.setCompletionPercentage(pct);
            changed = true;
        }

        if (step.getPlannedDurationMinutes() == null && step.getDurationPerUnit() != null && required > 0) {
            double total = step.getDurationPerUnit() * required;
            if ("HOURS".equalsIgnoreCase(step.getDurationUnit())) total *= 60;
            step.setPlannedDurationMinutes((int) Math.ceil(total));
            changed = true;
        }

        if (step.getActualDurationMinutes() == null) {
            if (step.getStartedAt() != null && step.getCompletedAt() != null) {
                step.setActualDurationMinutes((int) ChronoUnit.MINUTES.between(step.getStartedAt(), step.getCompletedAt()));
            } else {
                step.setActualDurationMinutes(0);
            }
            changed = true;
        }

        if (step.getRemainingDurationMinutes() == null) {
            if (step.getStatus() == ProductionStepStatus.COMPLETED || step.getStatus() == ProductionStepStatus.SKIPPED) {
                step.setRemainingDurationMinutes(0);
            } else if (step.getPlannedDurationMinutes() != null) {
                step.setRemainingDurationMinutes(step.getPlannedDurationMinutes());
            } else {
                step.setRemainingDurationMinutes(0);
            }
            changed = true;
        }

        return changed;
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
            if (prev.getStatus() == ProductionStepStatus.READY
                    || prev.getStatus() == ProductionStepStatus.PENDING) {
                return false;
            }
            if (prev.getStatus() == ProductionStepStatus.IN_PROGRESS) {
                if (prev.getCompletedQuantity() != null && prev.getCompletedQuantity() > 0) {
                    break;
                }
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
            try {
                invoiceService.createInvoiceFromOrderSystem(orderId);
            } catch (Exception e) {
                System.err.println("Failed to auto-generate invoice for order " + orderId + ": " + e.getMessage());
            }

            realtimeEventService.broadcastProductionCompleted(
                    orderId, orderId, null, order.getTotalQuantity() != null ? order.getTotalQuantity() : 0);
            auditService.log("ProductionOrder", orderId, "ALL_STEPS_COMPLETED",
                    order.getOrganizationId(), null,
                    "All production steps completed for order " + order.getOrderReference());
        }
    }

    private OrderProductionDto toOrderProductionDto(Orders order,
            ProductionSchedulingService.ScheduledOrder scheduledOrder,
            List<ProductionStepEntity> steps) {
        OrderProductionDto dto = new OrderProductionDto();
        dto.setOrderId(order.getId());
        dto.setOrderReference(order.getOrderReference());
        dto.setOrganizationId(order.getOrganizationId());

        organizationRepository.findById(order.getOrganizationId())
                .ifPresent(org -> dto.setOrganizationName(org.getName()));

        int totalQty = order.getTotalQuantity() != null ? order.getTotalQuantity() : 0;
        dto.setTotalQuantity(totalQty);
        dto.setStatus(order.getStatus().name());

        if (scheduledOrder != null) {
            dto.setPlannedStartDateTime(scheduledOrder.getPlannedStartDateTime());
            dto.setPlannedEndDateTime(scheduledOrder.getPlannedEndDateTime());
            dto.setForecastEndDateTime(scheduledOrder.getForecastEndDateTime());
            dto.setDelayStatus(scheduledOrder.getDelayStatus());
            dto.setDelayMinutes(scheduledOrder.getDelayMinutes());
        } else if (order.getPlannedStartDateTime() != null) {
            dto.setPlannedStartDateTime(order.getPlannedStartDateTime());
            dto.setPlannedEndDateTime(order.getPlannedEndDateTime());
            dto.setForecastEndDateTime(order.getForecastEndDateTime());
            dto.setDelayStatus(order.getDelayStatus());
        }

        List<OrderItem> items = order.getItems() != null ? order.getItems() : List.of();
        List<OrderProductionItemDto> itemDtos = items.stream().map(item -> {
            OrderProductionItemDto i = new OrderProductionItemDto();
            i.setProductId(item.getProductId());
            i.setProductName(item.getProductName());
            i.setQuantity(item.getQuantity() != null ? item.getQuantity() : 0);
            Optional<TechnicalSheet> sheet = technicalSheetRepository
                    .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(item.getProductId(), TechnicalSheetType.OPERATION_SHEET, TechnicalSheetStatus.ACTIVE);
            i.setTechnicalSheetFound(sheet.isPresent() ? "Found" : "Not found");
            return i;
        }).collect(Collectors.toList());
        dto.setItems(itemDtos);

        boolean stepsExist = scheduledOrder != null
                ? stepsExistForOrder(scheduledOrder.getOrderId())
                : stepEntityRepository.existsByOrderId(order.getId());
        dto.setStepsGenerated(stepsExist);

        if (stepsExist) {
            long total = scheduledOrder != null
                    ? stepCountForOrder(scheduledOrder.getOrderId())
                    : stepEntityRepository.countByOrderId(order.getId());
            long completed = stepEntityRepository.countByOrderIdAndStatus(
                    scheduledOrder != null ? scheduledOrder.getOrderId() : order.getId(),
                    ProductionStepStatus.COMPLETED);
            long skipped = stepEntityRepository.countByOrderIdAndStatus(
                    scheduledOrder != null ? scheduledOrder.getOrderId() : order.getId(),
                    ProductionStepStatus.SKIPPED);
            long done = completed + skipped;
            dto.setCompletedSteps((int) done);
            dto.setTotalSteps((int) total);
            dto.setProgressPercent(total > 0 ? (int) Math.round(done * 100.0 / total) : 0);

            String orderId = scheduledOrder != null ? scheduledOrder.getOrderId() : order.getId();
            List<ProductionStepEntity> orderSteps = steps.isEmpty()
                    ? stepEntityRepository.findByOrderIdOrderBySequenceOrderAsc(orderId)
                    : steps;
            dto.setCurrentOperation(orderSteps.stream()
                    .filter(s -> s.getStatus() == ProductionStepStatus.IN_PROGRESS)
                    .findFirst().map(ProductionStepEntity::getOperationName).orElse(null));
            dto.setNextOperation(orderSteps.stream()
                    .filter(s -> s.getStatus() == ProductionStepStatus.READY)
                    .findFirst().map(ProductionStepEntity::getOperationName).orElse(null));

            dto.setEstimatedStartTime(orderSteps.stream()
                    .filter(s -> s.getPlannedStartTime() != null)
                    .map(ProductionStepEntity::getPlannedStartTime)
                    .findFirst().orElse(null));
            dto.setEstimatedCompletionDateTime(orderSteps.stream()
                    .filter(s -> s.getPlannedEndTime() != null)
                    .map(ProductionStepEntity::getPlannedEndTime)
                    .reduce((first, second) -> second).orElse(null));

            double totalMinutes = orderSteps.stream()
                    .filter(s -> s.getTotalDuration() != null)
                    .mapToDouble(ProductionStepEntity::getTotalDuration).sum();
            dto.setEstimatedCompletionTime(formatDuration(totalMinutes, "MINUTES"));

            dto.setHealthScore(schedulingService.computeOrderHealthScore(orderSteps));

            dto.setPriorityScore(order.getPriorityScore() != null ? order.getPriorityScore()
                    : schedulingService.computePriorityScore(order, orderSteps));
            dto.setPriorityLevel(schedulingService.getPriorityLevel(
                    dto.getPriorityScore() != null ? dto.getPriorityScore() : 0));

            long totalIssues = operationIssueRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).size();
            long unresolvedIssues = operationIssueRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                    .filter(i -> !i.isResolved()).count();
            dto.setTotalIssues((int) totalIssues);
            dto.setUnresolvedIssues((int) unresolvedIssues);

            if (stepsExist) {
                String wipOrderId = scheduledOrder != null ? scheduledOrder.getOrderId() : order.getId();
                List<ProductionStepEntity> wipSteps = steps.isEmpty()
                        ? stepEntityRepository.findByOrderIdOrderBySequenceOrderAsc(wipOrderId)
                        : steps;
                int totalReq = wipSteps.stream()
                        .filter(s -> s.getRequiredQuantity() != null)
                        .mapToInt(ProductionStepEntity::getRequiredQuantity).sum();
                int totalCmp = wipSteps.stream()
                        .filter(s -> s.getCompletedQuantity() != null)
                        .mapToInt(ProductionStepEntity::getCompletedQuantity).sum();
                dto.setTotalRequiredQuantity(totalReq);
                dto.setTotalCompletedQuantity(totalCmp);
                dto.setTotalRemainingQuantity(totalReq - totalCmp);
                dto.setAverageCompletionPercentage(totalReq > 0
                        ? Math.round((double) totalCmp / totalReq * 100.0) : 0.0);
            }
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
        dto.setPlannedStartTime(entity.getPlannedStartTime());
        dto.setPlannedEndTime(entity.getPlannedEndTime());

        LocalDateTime now = LocalDateTime.now();
        boolean isOverdue = false;
        if (entity.getStatus() == ProductionStepStatus.PLANNED
                || entity.getStatus() == ProductionStepStatus.WAITING
                || entity.getStatus() == ProductionStepStatus.READY
                || entity.getStatus() == ProductionStepStatus.PENDING) {
            isOverdue = entity.getPlannedStartTime() != null
                    && now.isAfter(entity.getPlannedStartTime());
        } else if (entity.getStatus() == ProductionStepStatus.IN_PROGRESS) {
            isOverdue = entity.getPlannedEndTime() != null
                    && now.isAfter(entity.getPlannedEndTime());
        }
        dto.setOverdue(isOverdue);
        dto.setStartedAt(entity.getStartedAt());
        dto.setCompletedAt(entity.getCompletedAt());
        dto.setBlockedReason(entity.getBlockedReason());
        dto.setCompletedBy(entity.getCompletedBy());

        dto.setForecastStartTime(entity.getForecastStartTime());
        dto.setForecastEndTime(entity.getForecastEndTime());
        dto.setActualDuration(entity.getActualDuration());
        dto.setDelayStatus(entity.getDelayStatus());
        dto.setDelayMinutes(entity.getDelayMinutes());
        dto.setHealthScore(entity.getHealthScore());
        dto.setAssignedEmployee(entity.getAssignedEmployee());
        dto.setAssignedEmployeeName(entity.getAssignedEmployeeName());

        List<OperationIssue> issues = operationIssueRepository.findByStepIdOrderByCreatedAtDesc(entity.getId());
        dto.setIssues(issues.stream().map(this::toIssueDto).collect(Collectors.toList()));

        dto.setRequiredQuantity(entity.getRequiredQuantity());
        dto.setCompletedQuantity(entity.getCompletedQuantity());
        dto.setRemainingQuantity(entity.getRemainingQuantity());
        dto.setCompletionPercentage(entity.getCompletionPercentage());
        dto.setPlannedDurationMinutes(entity.getPlannedDurationMinutes());
        dto.setActualDurationMinutes(entity.getActualDurationMinutes());
        dto.setRemainingDurationMinutes(entity.getRemainingDurationMinutes());

        dto.setProducedQuantity(entity.getProducedQuantity());
        dto.setRejectedQuantity(entity.getRejectedQuantity());
        dto.setReworkedQuantity(entity.getReworkedQuantity());

        return dto;
    }

    private OperationIssueDto toIssueDto(OperationIssue issue) {
        if (issue == null) return null;
        OperationIssueDto dto = new OperationIssueDto();
        dto.setId(issue.getId());
        dto.setStepId(issue.getStepId());
        dto.setOrderId(issue.getOrderId());
        dto.setIssueType(issue.getIssueType());
        dto.setTitle(issue.getTitle());
        dto.setDescription(issue.getDescription());
        dto.setCreatedBy(issue.getCreatedBy());
        dto.setCreatedByName(issue.getCreatedByName());
        dto.setCreatedAt(issue.getCreatedAt());
        dto.setResolvedBy(issue.getResolvedBy());
        dto.setResolvedByName(issue.getResolvedByName());
        dto.setResolvedAt(issue.getResolvedAt());
        dto.setResolved(issue.isResolved());
        return dto;
    }

    private DepartmentQueueDto.DepartmentOperation toDepartmentOperation(
            ProductionStepEntity step, Orders order) {
        DepartmentQueueDto.DepartmentOperation op = new DepartmentQueueDto.DepartmentOperation();
        op.setOperationId(step.getId());
        op.setOrderId(step.getOrderId());
        op.setOrderReference(order != null ? order.getOrderReference() : null);
        op.setProductName(step.getProductName());
        op.setOperationName(step.getOperationName());
        op.setQuantity(step.getOrderQuantity());
        op.setPlannedStartDateTime(step.getPlannedStartTime());
        op.setPlannedEndDateTime(step.getPlannedEndTime());
        op.setForecastEndDateTime(step.getForecastEndTime());
        op.setStatus(step.getStatus());
        op.setAssignedEmployee(step.getAssignedEmployee());
        op.setAssignedEmployeeName(step.getAssignedEmployeeName());
        op.setSequenceOrder(step.getSequenceOrder());

        op.setRequiredQuantity(step.getRequiredQuantity());
        op.setCompletedQuantity(step.getCompletedQuantity());
        op.setRemainingQuantity(step.getRemainingQuantity());
        op.setCompletionPercentage(step.getCompletionPercentage());

        boolean isOverdue = false;
        LocalDateTime now = LocalDateTime.now();
        if (step.getStatus() == ProductionStepStatus.PLANNED
                || step.getStatus() == ProductionStepStatus.READY) {
            isOverdue = step.getPlannedStartTime() != null && now.isAfter(step.getPlannedStartTime());
        } else if (step.getStatus() == ProductionStepStatus.IN_PROGRESS) {
            isOverdue = step.getPlannedEndTime() != null && now.isAfter(step.getPlannedEndTime());
        }
        op.setOverdue(isOverdue);
        op.setDelayStatus(step.getDelayStatus());
        op.setDelayMinutes(step.getDelayMinutes());
        op.setHealthScore(step.getHealthScore());
        op.setPriorityScore(order != null ? (order.getPriorityScore() != null ? order.getPriorityScore() : 0) : 0);
        return op;
    }


    private boolean stepsExistForOrder(String orderId) {
        return stepEntityRepository.existsByOrderId(orderId);
    }

    private long stepCountForOrder(String orderId) {
        return stepEntityRepository.countByOrderId(orderId);
    }

    private void rescheduleSubsequentSteps(String orderId, Integer completedSequenceOrder, LocalDateTime anchor) {
        List<ProductionStepEntity> allSteps = stepEntityRepository
                .findByOrderIdOrderBySequenceOrderAsc(orderId);
        LocalDateTime currentTime = schedulingService.nextWorkingTime(anchor);
        boolean needsSave = false;
        for (ProductionStepEntity step : allSteps) {
            if (step.getSequenceOrder() <= completedSequenceOrder) continue;
            if (step.getStatus() != ProductionStepStatus.PLANNED
                    && step.getStatus() != ProductionStepStatus.READY
                    && step.getStatus() != ProductionStepStatus.PENDING
                    && step.getStatus() != ProductionStepStatus.WAITING) continue;
            if (Boolean.TRUE.equals(step.getCanRunInParallel())) continue;
            double durationInMinutes = "HOURS".equalsIgnoreCase(step.getDurationUnit())
                    ? step.getTotalDuration() * 60
                    : step.getTotalDuration();
            long mins = Math.round(durationInMinutes);
            step.setPlannedStartTime(currentTime);
            step.setPlannedEndTime(currentTime.plusMinutes(mins));
            currentTime = step.getPlannedEndTime();
            needsSave = true;
        }
        if (needsSave) {
            stepEntityRepository.saveAll(allSteps);
        }
    }

    private void alignStepsForOrderInQueue(String orderId, List<ProductionStepEntity> steps) {
        List<Orders> allOrders = ordersRepository.findAll().stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.READY_FOR_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.IN_PRODUCTION)
                .collect(Collectors.toList());

        Map<String, List<ProductionStepEntity>> stepsByOrderId =
                stepEntityRepository.findAll().stream()
                        .collect(Collectors.groupingBy(ProductionStepEntity::getOrderId));

        List<ProductionSchedulingService.ScheduledOrder> schedule =
                schedulingService.computeQueueSchedule(allOrders, stepsByOrderId);

        schedule.stream()
                .filter(s -> s.getOrderId().equals(orderId))
                .findFirst()
                .ifPresent(scheduled -> {
                    schedulingService.alignStepsToWindow(steps, scheduled.getPlannedStartDateTime());
                    stepEntityRepository.saveAll(steps);
                });
    }

    private void activatePlannedSteps(String orderId) {
        List<ProductionStepEntity> allSteps = stepEntityRepository
                .findByOrderIdOrderBySequenceOrderAsc(orderId);
        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;

        for (ProductionStepEntity step : allSteps) {
            if (step.getStatus() == ProductionStepStatus.PENDING) {
                step.setStatus(ProductionStepStatus.READY);
                changed = true;
            } else if (step.getStatus() == ProductionStepStatus.WAITING) {
                step.setStatus(ProductionStepStatus.PLANNED);
                changed = true;
            }
        }

        for (ProductionStepEntity step : allSteps) {
            if (step.getStatus() != ProductionStepStatus.PLANNED) continue;
            if (step.getPlannedStartTime() != null && now.isBefore(step.getPlannedStartTime())) {
                boolean hasPartialProgress = hasPreviousStepPartialProgress(step, allSteps);
                if (!hasPartialProgress) continue;
            }
            if (canStartStep(step)) {
                Integer available = getPreviousStepCompletedQuantity(step, allSteps);
                if (available != null && available > 0
                        && !Boolean.TRUE.equals(step.getCanRunInParallel())) {
                    step.setRequiredQuantity(available);
                }
                step.setStatus(ProductionStepStatus.READY);
                changed = true;
            }
        }
        if (changed) {
            stepEntityRepository.saveAll(allSteps);
        }
    }

    private Integer getPreviousStepCompletedQuantity(ProductionStepEntity step, List<ProductionStepEntity> allSteps) {
        int idx = -1;
        for (int i = 0; i < allSteps.size(); i++) {
            if (allSteps.get(i).getId().equals(step.getId())) {
                idx = i;
                break;
            }
        }
        if (idx <= 0) return null;
        for (int i = idx - 1; i >= 0; i--) {
            ProductionStepEntity prev = allSteps.get(i);
            if (Boolean.TRUE.equals(prev.getCanRunInParallel())) continue;
            if (prev.getStatus() == ProductionStepStatus.COMPLETED
                    || prev.getStatus() == ProductionStepStatus.SKIPPED) {
                return null;
            }
            if (prev.getStatus() == ProductionStepStatus.IN_PROGRESS) {
                return prev.getCompletedQuantity();
            }
            return null;
        }
        return null;
    }

    private boolean hasPreviousStepPartialProgress(ProductionStepEntity step, List<ProductionStepEntity> allSteps) {
        int idx = -1;
        for (int i = 0; i < allSteps.size(); i++) {
            if (allSteps.get(i).getId().equals(step.getId())) {
                idx = i;
                break;
            }
        }
        if (idx <= 0) return false;
        for (int i = idx - 1; i >= 0; i--) {
            ProductionStepEntity prev = allSteps.get(i);
            if (Boolean.TRUE.equals(prev.getCanRunInParallel())) continue;
            if (Boolean.TRUE.equals(prev.getQualityCheckRequired())) {
                return prev.getStatus() == ProductionStepStatus.COMPLETED;
            }
            if (prev.getStatus() == ProductionStepStatus.COMPLETED
                    || prev.getStatus() == ProductionStepStatus.SKIPPED) {
                return false;
            }
            if (prev.getStatus() == ProductionStepStatus.IN_PROGRESS
                    && prev.getCompletedQuantity() != null
                    && prev.getCompletedQuantity() > 0) {
                return true;
            }
            return false;
        }
        return false;
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

    private void accumulateOrderProductionCost(Orders order, List<ProductionStepEntity> steps) {
        double totalCost = 0;
        for (ProductionStepEntity s : steps) {
            if (s.getTotalExecutionCost() != null) {
                totalCost += s.getTotalExecutionCost();
            }
        }
        order.setTotalProductionCost(totalCost);
        order.setProductionCost(totalCost);
        if (order.getTotalMaterialCost() != null) {
            order.setTotalCost(order.getTotalMaterialCost() + totalCost);
        }
        order.setUpdatedAt(LocalDateTime.now());
    }
}
