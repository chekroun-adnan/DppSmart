package com.dppsmart.dppsmart.Allocation.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Allocation.DTO.AllocationRequestDTO;
import com.dppsmart.dppsmart.Allocation.DTO.AllocationReviewResponseDTO;
import com.dppsmart.dppsmart.Allocation.DTO.ProductionPlanningDTO;
import com.dppsmart.dppsmart.Allocation.DTO.SimulationImpactDTO;
import com.dppsmart.dppsmart.Allocation.Entities.AllocationSession;
import com.dppsmart.dppsmart.Allocation.Repositories.AllocationSessionRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Production.DTO.CreateProductionDto;
import com.dppsmart.dppsmart.Production.Services.ProductionService;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.ProductionCapacity.Services.CapacityService;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomMaterialLineDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.BomCalculationResultDto;
import com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService;
import com.dppsmart.dppsmart.User.Entities.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AllocationService {

    private final OrdersRepository ordersRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TechnicalSheetModuleService technicalSheetModuleService;
    private final AllocationSessionRepository allocationSessionRepository;
    private final ReservationService reservationService;
    private final CapacityService capacityService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final PermissionService permissionService;
    private final ProductionService productionService;
    private final AiProductionPlanningService aiProductionPlanningService;

    private OrdersService ordersService;

    @Autowired
    @Lazy
    public void setOrdersService(OrdersService ordersService) {
        this.ordersService = ordersService;
    }

    @Deprecated(since = "Use BulkOrderMaterialRequirementService.compute() instead (sharing-aware sequential pool)")
    public AllocationReviewResponseDTO getReviewData(List<String> orderIds, User user) {
        String orgId = resolveOrgId(user);
        List<Orders> orders = ordersRepository.findAllById(orderIds);
        if (orders.isEmpty()) throw new NotFoundException("No orders found");

        List<AllocationReviewResponseDTO.OrderCardDTO> cards = new ArrayList<>();
        Map<String, Integer> totalAllocations = new HashMap<>();
        List<String> warnings = new ArrayList<>();

        for (Orders order : orders) {
            if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
                throw new ForbiddenException("Access denied to order " + order.getOrderReference());

            List<AllocationReviewResponseDTO.ProductLineDTO> productLines = new ArrayList<>();
            int totalAllocated = 0;
            int totalToProduce = 0;

            for (var item : order.getItems()) {
                ProductStock ps = productStockRepository.findByProductId(item.getProductId()).stream().findFirst().orElse(null);
                int availableStock = ps != null && ps.getQuantity() != null ? ps.getQuantity() : 0;
                int psReserved = ps != null && ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
                int effectiveAvailable = Math.max(0, availableStock - psReserved);

                int allocation = Math.min(item.getQuantity(), effectiveAvailable);
                int remaining = item.getQuantity() - allocation;

                totalAllocations.merge(item.getProductId(), allocation, Integer::sum);
                totalAllocated += allocation;
                totalToProduce += remaining;

                List<AllocationReviewResponseDTO.MaterialLineDTO> itemMaterials = new ArrayList<>();
                int producibleQty = remaining;
                String prodStatus = "NO_BOM";

                if (remaining > 0) {
                    try {
                        BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(item.getProductId(), remaining, orgId);
                        if (bom != null && bom.getMaterials() != null && !bom.getMaterials().isEmpty()) {
                            for (BomMaterialLineDto mat : bom.getMaterials()) {
                                MaterialStock ms = materialStockRepository.findById(mat.getMaterialId()).orElse(null);
                                int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                                int matRes = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
                                int avail = Math.max(0, physQty - matRes);
                                double required = mat.getRequiredQuantity();
                                double missing = Math.max(0, required - avail);
                                boolean enough = avail >= required;

                                double effectiveQpu = remaining > 0 && mat.getQuantityPerUnit() > 0
                                        ? mat.getRequiredQuantity() / remaining
                                        : mat.getQuantityPerUnit();
                                int maxFromMat = effectiveQpu > 0
                                        ? (int) Math.floor(avail / effectiveQpu)
                                        : (enough ? remaining : 0);
                                producibleQty = Math.min(producibleQty, maxFromMat);

                                itemMaterials.add(AllocationReviewResponseDTO.MaterialLineDTO.builder()
                                        .materialId(mat.getMaterialId())
                                        .materialName(mat.getMaterialName())
                                        .requiredQuantity(required)
                                        .availableQuantity(avail)
                                        .reservedQuantity(matRes)
                                        .missingQuantity(missing)
                                        .unit(mat.getUnit())
                                        .status(enough ? "AVAILABLE" : "INSUFFICIENT")
                                        .enough(enough)
                                        .build());
                            }
                            if (producibleQty >= remaining) prodStatus = "READY_FOR_PRODUCTION";
                            else if (producibleQty > 0)      prodStatus = "PARTIALLY_PRODUCIBLE";
                            else                              prodStatus = "MATERIALS_MISSING";
                        }
                    } catch (Exception e) {
                        log.warn("BOM calc failed for product {} in order {}: {}", item.getProductId(), order.getId(), e.getMessage());
                        producibleQty = 0;
                        prodStatus = "NO_BOM";
                    }
                } else {
                    prodStatus = "COVERED";
                    producibleQty = 0;
                }

                productLines.add(AllocationReviewResponseDTO.ProductLineDTO.builder()
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .orderedQuantity(item.getQuantity())
                        .availableFinishedStock(availableStock)
                        .allocatedQuantity(allocation)
                        .remainingToProduce(remaining)
                        .unit(item.getUnit() != null ? item.getUnit() : "units")
                        .status(allocation >= item.getQuantity() ? "COVERED" : remaining > 0 ? "PARTIAL" : "PENDING")
                        .producibleQuantityNow(producibleQty)
                        .productionStatus(prodStatus)
                        .canStartProduction(producibleQty > 0)
                        .itemMaterials(itemMaterials)
                        .build());
            }

            boolean hasBom = order.getItems().stream().anyMatch(i -> i.getTechnicalSheetId() != null);
            boolean anyProducible = productLines.stream().anyMatch(p -> p.isCanStartProduction());
            boolean allReady = productLines.stream()
                    .filter(p -> p.getRemainingToProduce() > 0)
                    .allMatch(p -> "READY_FOR_PRODUCTION".equals(p.getProductionStatus()));
            List<String> readinessIssues = new ArrayList<>();
            if (!hasBom) readinessIssues.add("Missing BOM");
            if (!allReady && !anyProducible) readinessIssues.add("Insufficient materials");

            cards.add(AllocationReviewResponseDTO.OrderCardDTO.builder()
                    .orderId(order.getId())
                    .orderReference(order.getOrderReference())
                    .clientName(order.getCreatedBy())
                    .requestedDeliveryDate(order.getRequestedDeliveryDate())
                    .status(order.getStatus().name())
                    .priorityLevel(getPriorityLevel(order))
                    .products(productLines)
                    .totalOrderedQuantity(order.getTotalQuantity() != null ? order.getTotalQuantity() : 0)
                    .totalAllocatedQuantity(totalAllocated)
                    .totalRemainingToProduce(totalToProduce)
                    .productionReadiness(AllocationReviewResponseDTO.ProductionReadinessDTO.builder()
                            .hasBom(hasBom)
                            .materialsAvailable(anyProducible)
                            .estimatedDurationMinutes(estimateDuration(order))
                            .issues(readinessIssues)
                            .build())
                    .materialReadiness(AllocationReviewResponseDTO.MaterialReadinessDTO.builder()
                            .allAvailable(allReady)
                            .materials(productLines.stream().flatMap(p -> p.getItemMaterials().stream()).collect(Collectors.toList()))
                            .build())
                    .estimatedProductionTime(estimateDuration(order) + " min")
                    .urgent(order.getRequestedDeliveryDate() != null
                            && order.getRequestedDeliveryDate().isBefore(java.time.LocalDate.now().plusDays(7)))
                    .build());
        }

        int totalAvail = productStockRepository.findAll().stream()
                .filter(s -> s.getOrganizationId().equals(orgId))
                .mapToInt(s -> s.getQuantity() != null ? s.getQuantity() : 0)
                .sum();
        int totalReserved = productStockRepository.findAll().stream()
                .filter(s -> s.getOrganizationId().equals(orgId))
                .mapToInt(s -> s.getReservedQuantity() != null ? s.getReservedQuantity() : 0)
                .sum();
        int totalAllocatedInSession = totalAllocations.values().stream().mapToInt(Integer::intValue).sum();

        if (totalAllocatedInSession > totalAvail - totalReserved) {
            warnings.add("Allocation exceeds available stock after existing reservations");
        }

        return AllocationReviewResponseDTO.builder()
                .orders(cards)
                .stockSummary(AllocationReviewResponseDTO.GlobalStockSummaryDTO.builder()
                        .totalAvailableStock(totalAvail)
                        .totalReservedStock(totalReserved)
                        .totalAllocatedInSession(totalAllocatedInSession)
                        .remainingStockAfterAllocation(totalAvail - totalReserved - totalAllocatedInSession)
                        .build())
                .warnings(warnings)
                .canProceed(warnings.isEmpty())
                .build();
    }

    @Transactional
    public AllocationReviewResponseDTO recalculateAllocation(AllocationRequestDTO dto, User user) {
        String orgId = resolveOrgId(user);
        List<Orders> orders = ordersRepository.findAllById(dto.getOrderIds());

        Map<String, Map<String, Integer>> allocationMap;

        switch (dto.getMode()) {
            case AUTO_OLDEST_ORDER:
                allocationMap = autoAllocateByOldest(orders);
                break;
            case AUTO_CLOSEST_DEADLINE:
                allocationMap = autoAllocateByDeadline(orders);
                break;
            case AUTO_CLIENT_PRIORITY:
                allocationMap = autoAllocateByPriority(orders);
                break;
            case AUTO_MAX_FULFILLMENT:
                allocationMap = autoAllocateByMaxFulfillment(orders);
                break;
            case MANUAL:
            default:
                allocationMap = dto.getManualAllocations() != null ? dto.getManualAllocations() : new HashMap<>();
                break;
        }

        validateAllocations(allocationMap);

        AllocationSession session = new AllocationSession();
        session.setId(NanoIdUtils.randomNanoId());
        session.setCreatedBy(user.getEmail());
        session.setOrganizationId(orgId);
        session.setOrderIds(dto.getOrderIds());
        session.setAllocationMode(AllocationSession.AllocationMode.valueOf(dto.getMode().name()));
        session.setStatus(AllocationSession.AllocationStatus.DRAFT);
        session.setAllocations(allocationMap);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(2));
        allocationSessionRepository.save(session);

        auditService.log("AllocationSession", session.getId(), "CREATE", orgId, null,
                "Allocation session created: " + dto.getMode() + " for " + dto.getOrderIds().size() + " orders");

        AllocationReviewResponseDTO review = getReviewData(dto.getOrderIds(), user);
        return AllocationReviewResponseDTO.builder()
                .sessionId(session.getId())
                .orders(review.getOrders())
                .stockSummary(review.getStockSummary())
                .warnings(review.getWarnings())
                .canProceed(review.isCanProceed())
                .build();
    }

    @Transactional
    public SimulationImpactDTO previewImpact(String sessionId, User user) {
        AllocationSession session = allocationSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Allocation session not found"));

        String orgId = resolveOrgId(user);
        List<Orders> orders = ordersRepository.findAllById(session.getOrderIds());
        Map<String, Integer> stockBefore = new HashMap<>();
        Map<String, Integer> stockAfter = new HashMap<>();
        List<SimulationImpactDTO.ReservationChangeDTO> reservationChanges = new ArrayList<>();
        List<SimulationImpactDTO.MaterialConsumptionDTO> materialConsumptions = new ArrayList<>();
        List<SimulationImpactDTO.AffectedOrderDTO> affectedOrders = new ArrayList<>();
        List<SimulationImpactDTO.ShortageDTO> shortages = new ArrayList<>();
        List<SimulationImpactDTO.RiskDTO> risks = new ArrayList<>();

        productStockRepository.findByOrganizationId(orgId).forEach(ps ->
                stockBefore.put(ps.getProductId() != null ? ps.getProductId() : ps.getId(), ps.getQuantity() != null ? ps.getQuantity() : 0));

        int totalToProduce = 0;
        Map<String, Double> totalMaterialNeeded = new HashMap<>();

        for (Orders order : orders) {
            int allocated = 0;
            int toProduce = 0;

            for (var item : order.getItems()) {
                ProductStock ps = productStockRepository.findByProductId(item.getProductId()).stream().findFirst().orElse(null);
                int avail = ps != null && ps.getQuantity() != null ? ps.getQuantity() : 0;
                int reserved = ps != null && ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;

                Map<String, Integer> productAllocs = session.getAllocations().get(item.getProductId());
                int allocQty = 0;
                if (productAllocs != null) {
                    allocQty = productAllocs.getOrDefault(order.getId(), 0);
                }
                int remain = item.getQuantity() - allocQty;
                if (remain > 0) toProduce += remain;

                int newReserved = reserved + allocQty;
                stockAfter.put(item.getProductId(), avail - allocQty);

                reservationChanges.add(SimulationImpactDTO.ReservationChangeDTO.builder()
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .previouslyReserved(reserved)
                        .newlyReserved(allocQty)
                        .totalReservedAfter(newReserved)
                        .build());
            }

            totalToProduce += toProduce;

            affectedOrders.add(SimulationImpactDTO.AffectedOrderDTO.builder()
                    .orderId(order.getId())
                    .orderReference(order.getOrderReference())
                    .previousStatus(order.getStatus().name())
                    .newStatus(toProduce > 0 ? "READY_FOR_PRODUCTION" : "STOCK_RESERVED")
                    .allocatedFromStock(0)
                    .toProduce(toProduce)
                    .estimatedCompletionDate(order.getRequestedDeliveryDate())
                    .onTrack(toProduce == 0)
                    .build());
        }

        for (Orders order : orders) {
            for (var item : order.getItems()) {
                int remainingToProduce = item.getQuantity();
                Map<String, Integer> productAllocs = session.getAllocations().get(item.getProductId());
                if (productAllocs != null) {
                    remainingToProduce -= productAllocs.getOrDefault(order.getId(), 0);
                }
                if (remainingToProduce > 0) {
                    try {
                        var bomResult = technicalSheetModuleService.calculateBom(item.getProductId(), remainingToProduce, orgId);
                        if (bomResult != null && bomResult.getMaterials() != null) {
                            for (BomMaterialLineDto mat : bomResult.getMaterials()) {
                                totalMaterialNeeded.merge(mat.getMaterialId(), mat.getRequiredQuantity(), Double::sum);
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        for (Map.Entry<String, Double> entry : totalMaterialNeeded.entrySet()) {
            String matId = entry.getKey();
            double needed = entry.getValue();
            var matOpt = materialStockRepository.findById(matId);
            if (matOpt.isPresent()) {
                var mat = matOpt.get();
                int avail = mat.getQuantity() != null ? mat.getQuantity() : 0;
                int reserved = mat.getReservedQuantity() != null ? mat.getReservedQuantity() : 0;
                int effective = avail - reserved;
                double remaining = effective - needed;
                boolean sufficient = remaining >= 0;

                materialConsumptions.add(SimulationImpactDTO.MaterialConsumptionDTO.builder()
                        .materialId(matId)
                        .materialName(mat.getName())
                        .availableQuantity(effective)
                        .requiredQuantity(needed)
                        .remainingAfterConsumption(Math.max(0, remaining))
                        .sufficient(sufficient)
                        .build());

                if (!sufficient) {
                    shortages.add(SimulationImpactDTO.ShortageDTO.builder()
                            .materialId(matId)
                            .materialName(mat.getName())
                            .requiredQuantity(needed)
                            .availableQuantity(effective)
                            .shortageQuantity(Math.abs(remaining))
                            .unit(mat.getUnit() != null ? mat.getUnit() : "units")
                            .estimatedLeadDays(14)
                            .build());
                    risks.add(SimulationImpactDTO.RiskDTO.builder()
                            .type("MATERIAL_SHORTAGE")
                            .severity("HIGH")
                            .message("Missing " + Math.abs(remaining) + " " + mat.getUnit() + " of " + mat.getName())
                            .affectedEntity(matId)
                            .build());
                }
            }
        }

        if (totalToProduce > 0) {
            var capacityCheck = capacityService.checkCapacity(totalToProduce, orgId);
            if (!capacityCheck.isSufficient()) {
                risks.add(SimulationImpactDTO.RiskDTO.builder()
                        .type("CAPACITY_INSUFFICIENT")
                        .severity("MEDIUM")
                        .message("Production capacity insufficient. Estimated completion: " + capacityCheck.getEstimatedCompletionDate())
                        .affectedEntity("production")
                        .build());
            }
        }

        if (!shortages.isEmpty()) {
            risks.add(SimulationImpactDTO.RiskDTO.builder()
                    .type("DELAYED_ORDERS")
                    .severity("HIGH")
                    .message(shortages.size() + " material shortages will delay production")
                    .affectedEntity("orders")
                    .build());
        }

        session.setStatus(AllocationSession.AllocationStatus.SIMULATED);
        allocationSessionRepository.save(session);

        return SimulationImpactDTO.builder()
                .stockBefore(SimulationImpactDTO.StockImpactDTO.builder()
                        .productStockLevels(stockBefore)
                        .totalProductsAvailable(stockBefore.values().stream().mapToInt(Integer::intValue).sum())
                        .build())
                .stockAfter(SimulationImpactDTO.StockImpactDTO.builder()
                        .productStockLevels(stockAfter)
                        .totalProductsAvailable(stockAfter.values().stream().mapToInt(Integer::intValue).sum())
                        .build())
                .reservationChanges(reservationChanges)
                .materialConsumption(materialConsumptions)
                .affectedOrders(affectedOrders)
                .shortages(shortages)
                .risks(risks)
                .canProceed(risks.stream().noneMatch(r -> "HIGH".equals(r.getSeverity())))
                .build();
    }

    @Transactional
    public void confirmAllocation(String sessionId, User user) {
        AllocationSession session = allocationSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Allocation session not found"));

        if (session.getStatus() == AllocationSession.AllocationStatus.CONFIRMED) {
            throw new BadRequestException("Allocation already confirmed");
        }
        if (session.getStatus() == AllocationSession.AllocationStatus.CANCELLED) {
            throw new BadRequestException("Allocation session is cancelled");
        }

        List<Orders> orders = ordersRepository.findAllById(session.getOrderIds());
        String orgId = resolveOrgId(user);

        for (Orders order : orders) {
            for (var item : order.getItems()) {
                Map<String, Integer> productAllocs = session.getAllocations().get(item.getProductId());
                int allocQty = 0;
                if (productAllocs != null) {
                    allocQty = productAllocs.getOrDefault(order.getId(), 0);
                }
                if (allocQty > 0) {
                    reservationService.reserveProductStock(order.getId(), item.getProductId(), allocQty, user.getEmail(), orgId);
                }

                int remainingToProduce = item.getQuantity() - allocQty;
                if (remainingToProduce > 0) {
                    try {
                        var bomResult = technicalSheetModuleService.calculateBom(item.getProductId(), remainingToProduce, orgId);
                        if (bomResult != null && bomResult.getMaterials() != null) {
                            for (BomMaterialLineDto mat : bomResult.getMaterials()) {
                                int matQty = (int) Math.ceil(mat.getRequiredQuantity());
                                if (matQty > 0 && order.getMaterialSource() != com.dppsmart.dppsmart.Orders.Entities.MaterialSource.CLIENT_SUPPLIED) {
                                    reservationService.reserveMaterialStock(order.getId(), mat.getMaterialId(), matQty, user.getEmail(), orgId);
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            boolean hasProduction = order.getItems().stream()
                    .anyMatch(i -> {
                        Map<String, Integer> productAllocs = session.getAllocations().get(i.getProductId());
                        int allocd = productAllocs != null ? productAllocs.getOrDefault(order.getId(), 0) : 0;
                        return i.getQuantity() - allocd > 0;
                    });

            ClientOrderStatus newStatus;
            if (hasProduction) {
                boolean materialsReady = order.getItems().stream()
                        .filter(i -> {
                            Map<String, Integer> productAllocs = session.getAllocations().get(i.getProductId());
                            int allocd = productAllocs != null ? productAllocs.getOrDefault(order.getId(), 0) : 0;
                            return i.getQuantity() - allocd > 0;
                        })
                        .allMatch(i -> i.isMaterialsAvailable());
                newStatus = materialsReady ? ClientOrderStatus.READY_FOR_PRODUCTION : ClientOrderStatus.WAITING_FOR_MATERIALS;
            } else {
                newStatus = ClientOrderStatus.STOCK_RESERVED;
            }

            order.setStatus(newStatus);
            order.setUpdatedAt(LocalDateTime.now());
            order.setUpdatedBy(user.getEmail());
            ordersRepository.save(order);

            notificationService.createNotification(order.getClientId(), "Order Allocated",
                    "Stock allocated for order " + order.getOrderReference() + ". Status: " + newStatus,
                    Notification.NotificationType.ORDER, "/orders/" + order.getId());
        }

        session.setStatus(AllocationSession.AllocationStatus.CONFIRMED);
        session.setUpdatedAt(LocalDateTime.now());
        allocationSessionRepository.save(session);

        auditService.log("Allocation", sessionId, "CONFIRM", orgId, null,
                "Allocation confirmed for " + session.getOrderIds().size() + " orders");
    }

    @Transactional
    public void cancelAllocation(String orderId, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied");

        reservationService.releaseReservations(orderId);

        order.setStatus(ClientOrderStatus.PENDING_REVIEW);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        ordersRepository.save(order);

        auditService.log("Order", orderId, "CANCEL_ALLOCATION", order.getOrganizationId(), null,
                "Allocation cancelled for order " + order.getOrderReference());
    }

    private Map<String, Map<String, Integer>> autoAllocateByOldest(List<Orders> orders) {
        orders.sort(Comparator.comparing(Orders::getCreatedAt));
        return computeAutoAllocation(orders);
    }

    private Map<String, Map<String, Integer>> autoAllocateByDeadline(List<Orders> orders) {
        orders.sort(Comparator.comparing(Orders::getRequestedDeliveryDate, Comparator.nullsLast(Comparator.naturalOrder())));
        return computeAutoAllocation(orders);
    }

    private Map<String, Map<String, Integer>> autoAllocateByPriority(List<Orders> orders) {
        orders.sort((a, b) -> Integer.compare(getPriorityLevel(b), getPriorityLevel(a)));
        return computeAutoAllocation(orders);
    }

    private Map<String, Map<String, Integer>> autoAllocateByMaxFulfillment(List<Orders> orders) {
        Map<String, Map<String, Integer>> result = new HashMap<>();
        Map<String, Integer> productPools = new HashMap<>();

        for (Orders order : orders) {
            for (var item : order.getItems()) {
                ProductStock ps = productStockRepository.findByProductId(item.getProductId()).stream().findFirst().orElse(null);
                int avail = ps != null && ps.getQuantity() != null ? ps.getQuantity() : 0;
                int reserved = ps != null && ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
                productPools.putIfAbsent(item.getProductId(), Math.max(0, avail - reserved));
            }
        }

        for (Orders order : orders) {
            for (var item : order.getItems()) {
                int pool = productPools.getOrDefault(item.getProductId(), 0);
                int availableInPool = pool;

                double totalDemand = orders.stream()
                        .filter(o -> o.getItems().stream().anyMatch(i -> i.getProductId().equals(item.getProductId())))
                        .flatMap(o -> o.getItems().stream())
                        .filter(i -> i.getProductId().equals(item.getProductId()))
                        .mapToInt(i -> i.getQuantity())
                        .sum();

                if (totalDemand > 0) {
                    double fulfillmentRatio = (double) availableInPool / totalDemand;
                    int alloc = (int) Math.floor(item.getQuantity() * fulfillmentRatio);
                    result.computeIfAbsent(item.getProductId(), k -> new HashMap<>())
                            .put(order.getId(), Math.min(alloc, item.getQuantity()));
                }
            }
        }
        return result;
    }

    private Map<String, Map<String, Integer>> computeAutoAllocation(List<Orders> sortedOrders) {
        Map<String, Map<String, Integer>> result = new HashMap<>();
        Map<String, Integer> remainingStock = new HashMap<>();

        for (Orders order : sortedOrders) {
            for (var item : order.getItems()) {
                if (!remainingStock.containsKey(item.getProductId())) {
                    ProductStock ps = productStockRepository.findByProductId(item.getProductId()).stream().findFirst().orElse(null);
                    int avail = ps != null && ps.getQuantity() != null ? ps.getQuantity() : 0;
                    int reserved = ps != null && ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
                    remainingStock.put(item.getProductId(), Math.max(0, avail - reserved));
                }
            }
        }

        for (Orders order : sortedOrders) {
            for (var item : order.getItems()) {
                int available = remainingStock.getOrDefault(item.getProductId(), 0);
                int alloc = Math.min(item.getQuantity(), available);
                if (alloc > 0) {
                    result.computeIfAbsent(item.getProductId(), k -> new HashMap<>())
                            .put(order.getId(), alloc);
                    remainingStock.put(item.getProductId(), available - alloc);
                } else {
                    result.computeIfAbsent(item.getProductId(), k -> new HashMap<>())
                            .put(order.getId(), 0);
                }
            }
        }
        return result;
    }

    private void validateAllocations(Map<String, Map<String, Integer>> allocationMap) {
        for (Map.Entry<String, Map<String, Integer>> entry : allocationMap.entrySet()) {
            String productId = entry.getKey();
            int totalAllocated = entry.getValue().values().stream().mapToInt(Integer::intValue).sum();
            ProductStock ps = productStockRepository.findByProductId(productId).stream().findFirst().orElse(null);
            if (ps != null) {
                int avail = ps.getQuantity() != null ? ps.getQuantity() : 0;
                int reserved = ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
                int effectiveAvail = avail - reserved;
                if (totalAllocated > effectiveAvail) {
                    throw new BadRequestException("Total allocation " + totalAllocated
                            + " for product " + productId + " exceeds effective available stock " + effectiveAvail);
                }
            }
        }
    }

    private int getPriorityLevel(Orders order) {
        if (order.getRequestedDeliveryDate() == null) return 0;
        long daysUntilDue = java.time.LocalDate.now().until(order.getRequestedDeliveryDate()).getDays();
        if (daysUntilDue <= 3) return 5;
        if (daysUntilDue <= 7) return 4;
        if (daysUntilDue <= 14) return 3;
        if (daysUntilDue <= 30) return 2;
        return 1;
    }

    private int estimateDuration(Orders order) {
        return order.getItems().stream()
                .filter(i -> i.getEstimatedProductionTime() != null)
                .mapToInt(i -> {
                    try { return Integer.parseInt(i.getEstimatedProductionTime().replaceAll("[^0-9]", "")); }
                    catch (Exception e) { return 0; }
                })
                .sum();
    }

    private record MatAccum(String id, String name, String unit, double available, double reserved, double[] required) {}

    private List<AllocationReviewResponseDTO.MaterialLineDTO> getLiveMaterialLines(Orders order, String orgId) {
        Map<String, MatAccum> accum = new LinkedHashMap<>();
        if (order.getItems() == null) return new ArrayList<>();
        for (var item : order.getItems()) {
            int allocated = item.getAllocatedQuantity() != null ? item.getAllocatedQuantity() : 0;
            int remaining = Math.max(0, item.getQuantity() - allocated);
            if (remaining == 0) continue;
            try {
                BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(item.getProductId(), remaining, orgId);
                if (bom == null || bom.getMaterials() == null) continue;
                for (BomMaterialLineDto mat : bom.getMaterials()) {
                    MaterialStock ms = materialStockRepository.findById(mat.getMaterialId()).orElse(null);
                    int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                    int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
                    double available = Math.max(0, physQty - resQty);
                    accum.compute(mat.getMaterialId(), (k, v) -> {
                        if (v == null) {
                            double[] req = { mat.getRequiredQuantity() };
                            return new MatAccum(mat.getMaterialId(), mat.getMaterialName(), mat.getUnit(), available, resQty, req);
                        }
                        v.required()[0] += mat.getRequiredQuantity();
                        return v;
                    });
                }
            } catch (Exception ignored) {}
        }
        return accum.values().stream().map(a -> {
            double required = a.required()[0];
            double missing = Math.max(0, required - a.available());
            return AllocationReviewResponseDTO.MaterialLineDTO.builder()
                    .materialId(a.id())
                    .materialName(a.name())
                    .requiredQuantity(required)
                    .availableQuantity(a.available())
                    .reservedQuantity(a.reserved())
                    .missingQuantity(missing)
                    .unit(a.unit())
                    .status(missing > 0 ? "INSUFFICIENT" : "AVAILABLE")
                    .enough(missing == 0)
                    .build();
        }).collect(Collectors.toList());
    }

    public List<AllocationReviewResponseDTO.PerOrderProductionStatusDTO> getProductionAllocation(List<String> orderIds, User user) {
        String orgId = resolveOrgId(user);
        List<Orders> orders = ordersRepository.findAllById(orderIds);
        if (orders.isEmpty()) throw new NotFoundException("No orders found");

        List<AllocationReviewResponseDTO.PerOrderProductionStatusDTO> result = new ArrayList<>();

        for (Orders order : orders) {
            if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
                throw new ForbiddenException("Access denied to order " + order.getOrderReference());

            for (OrderItem item : order.getItems()) {
                int allocated = item.getAllocatedQuantity() != null ? item.getAllocatedQuantity() : 0;
                int produced = item.getRelatedProductionId() != null ? 0 : 0;
                int remaining = Math.max(0, item.getQuantity() - allocated - produced);

                if (remaining == 0) continue;

                List<AllocationReviewResponseDTO.MaterialLineDTO> materialLines = new ArrayList<>();
                int producibleQty = remaining;

                try {
                    BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(item.getProductId(), remaining, orgId);
                    if (bom != null && bom.getMaterials() != null) {
                        for (BomMaterialLineDto mat : bom.getMaterials()) {
                            MaterialStock ms = materialStockRepository.findById(mat.getMaterialId()).orElse(null);
                            int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                            int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
                            int available = Math.max(0, physQty - resQty);
                            double required = mat.getRequiredQuantity();
                            double missing = Math.max(0, required - available);
                            boolean enough = available >= required;

                            double effectiveQpu = remaining > 0 && mat.getQuantityPerUnit() > 0
                                    ? mat.getRequiredQuantity() / remaining
                                    : mat.getQuantityPerUnit();
                            int maxFromThisMat = effectiveQpu > 0
                                    ? (int) Math.floor(available / effectiveQpu)
                                    : (enough ? remaining : 0);
                            producibleQty = Math.min(producibleQty, maxFromThisMat);

                            materialLines.add(AllocationReviewResponseDTO.MaterialLineDTO.builder()
                                    .materialId(mat.getMaterialId())
                                    .materialName(mat.getMaterialName())
                                    .requiredQuantity(required)
                                    .availableQuantity(available)
                                    .reservedQuantity(resQty)
                                    .missingQuantity(missing)
                                    .unit(mat.getUnit())
                                    .status(enough ? "AVAILABLE" : "INSUFFICIENT")
                                    .enough(enough)
                                    .build());
                        }
                    }
                } catch (Exception e) {
                    log.warn("BOM calculation failed for product {} in order {}: {}", item.getProductId(), order.getId(), e.getMessage());
                }

                AllocationReviewResponseDTO.PerOrderProductionStatusDTO.ProductionStatus status;
                if (producibleQty >= remaining) {
                    status = AllocationReviewResponseDTO.PerOrderProductionStatusDTO.ProductionStatus.READY_FOR_PRODUCTION;
                } else if (producibleQty > 0) {
                    status = AllocationReviewResponseDTO.PerOrderProductionStatusDTO.ProductionStatus.PARTIALLY_PRODUCIBLE;
                } else {
                    status = AllocationReviewResponseDTO.PerOrderProductionStatusDTO.ProductionStatus.MATERIALS_MISSING;
                }

                result.add(AllocationReviewResponseDTO.PerOrderProductionStatusDTO.builder()
                        .orderId(order.getId())
                        .orderItemId(item.getProductId())
                        .productName(item.getProductName())
                        .orderedQuantity(item.getQuantity())
                        .remainingToProduce(remaining)
                        .producibleQuantityNow(producibleQty)
                        .productionStatus(status)
                        .canStartProduction(producibleQty > 0)
                        .materials(materialLines)
                        .build());
            }
        }
        return result;
    }

    @Transactional
    public AllocationReviewResponseDTO.PerOrderProductionStatusDTO startProductionForItem(
            String orderId, String productId, int quantityToProduce, User user) {

        String orgId = resolveOrgId(user);
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied");

        OrderItem item = order.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Order item not found for product " + productId));

        if (item.getRelatedProductionId() != null) {
            throw new BadRequestException("Production already started for this item (id: " + item.getRelatedProductionId() + ")");
        }

        int allocated = item.getAllocatedQuantity() != null ? item.getAllocatedQuantity() : 0;
        int remaining = Math.max(0, item.getQuantity() - allocated);
        if (quantityToProduce <= 0 || quantityToProduce > remaining) {
            throw new BadRequestException("Invalid quantity: must be between 1 and " + remaining);
        }

        if (order.getMaterialSource() != com.dppsmart.dppsmart.Orders.Entities.MaterialSource.CLIENT_SUPPLIED) {
            BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(productId, quantityToProduce, orgId);
            if (bom != null && bom.getMaterials() != null) {
                for (BomMaterialLineDto mat : bom.getMaterials()) {
                    MaterialStock ms = materialStockRepository.findById(mat.getMaterialId()).orElse(null);
                    int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                    int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
                    int available = Math.max(0, physQty - resQty);
                    if (available < mat.getRequiredQuantity()) {
                        throw new BadRequestException("Insufficient stock for material: " + mat.getMaterialName()
                                + " (need " + (int) mat.getRequiredQuantity() + ", have " + available + ")");
                    }
                }

                for (BomMaterialLineDto mat : bom.getMaterials()) {
                    int matQty = (int) Math.ceil(mat.getRequiredQuantity());
                    if (matQty > 0) {
                        reservationService.reserveMaterialStock(orderId, mat.getMaterialId(), matQty, user.getEmail(), orgId);
                    }
                }
            }
        }

        CreateProductionDto dto = new CreateProductionDto();
        dto.setProductId(productId);
        dto.setOrganizationId(orgId);
        dto.setQuantity(quantityToProduce);
        dto.setClientOrderId(orderId);
        dto.setSteps(List.of());

        var production = productionService.create(dto);

        item.setRelatedProductionId(production.getId());
        item.setStatus(com.dppsmart.dppsmart.Orders.Entities.OrderItemStatus.IN_PRODUCTION);
        order.setStatus(ClientOrderStatus.IN_PRODUCTION);
        if (order.getProductionStartedAt() == null) {
            order.setProductionStartedAt(LocalDateTime.now());
        }
        ordersService.freezeCostSnapshots(order);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        ordersRepository.save(order);

        auditService.log("Order", orderId, "START_PRODUCTION", orgId, null,
                "Production started for " + item.getProductName() + " x" + quantityToProduce);

        List<AllocationReviewResponseDTO.PerOrderProductionStatusDTO> updated = getProductionAllocation(List.of(orderId), user);
        return updated.stream()
                .filter(s -> s.getOrderItemId().equals(productId))
                .findFirst()
                .orElse(AllocationReviewResponseDTO.PerOrderProductionStatusDTO.builder()
                        .orderId(orderId)
                        .orderItemId(productId)
                        .productName(item.getProductName())
                        .productionStatus(AllocationReviewResponseDTO.PerOrderProductionStatusDTO.ProductionStatus.READY_FOR_PRODUCTION)
                        .canStartProduction(false)
                        .build());
    }

    public ProductionPlanningDTO calculateRequirements(User user) {
        String orgId = resolveOrgId(user);

        List<ClientOrderStatus> excludedStatuses = List.of(
                ClientOrderStatus.DELIVERED, ClientOrderStatus.CANCELLED,
                ClientOrderStatus.PRODUCTION_COMPLETED, ClientOrderStatus.READY_FOR_DELIVERY
        );
        List<Orders> orders = ordersRepository.findByOrganizationId(orgId).stream()
                .filter(o -> !excludedStatuses.contains(o.getStatus()))
                .collect(Collectors.toList());

        List<ProductionPlanningDTO.OrderPlanDTO> orderDtos = new ArrayList<>();

        Map<String, double[]> materialPool = new HashMap<>();
        Map<String, Double> initialStock = new HashMap<>();
        Map<String, String> materialUnit = new HashMap<>();
        Map<String, String> materialName = new HashMap<>();
        Map<String, Double> totalMatRequired = new LinkedHashMap<>();

        Set<String> allMaterialIds = new HashSet<>();
        for (Orders order : orders) {
            for (OrderItem item : order.getItems()) {
                int remaining = Math.max(0, item.getQuantity()
                        - (item.getAllocatedQuantity() != null ? item.getAllocatedQuantity() : 0));
                if (remaining == 0 || item.getRelatedProductionId() != null) continue;
                try {
                    BomCalculationResultDto bom = technicalSheetModuleService.calculateBom(
                            item.getProductId(), remaining, orgId);
                    if (bom != null && bom.getMaterials() != null) {
                        for (BomMaterialLineDto mat : bom.getMaterials()) {
                            allMaterialIds.add(mat.getMaterialId());
                        }
                    }
                } catch (Exception e) {
                    log.warn("BOM fetch failed for {}: {}", item.getProductId(), e.getMessage());
                }
            }
        }

        for (String mid : allMaterialIds) {
            MaterialStock ms = materialStockRepository.findById(mid).orElse(null);
            int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
            int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            double avail = Math.max(0, physQty - resQty);
            materialPool.put(mid, new double[]{avail});
            initialStock.put(mid, avail);
            if (ms != null) {
                materialUnit.put(mid, ms.getUnit());
                materialName.put(mid, ms.getName());
            }
        }

        int simIndex = 0;
        for (Orders order : orders) {
            List<ProductionPlanningDTO.ItemPlanDTO> itemDtos = new ArrayList<>();

            for (OrderItem item : order.getItems()) {
                int allocated = item.getAllocatedQuantity() != null ? item.getAllocatedQuantity() : 0;
                int remaining = Math.max(0, item.getQuantity() - allocated);

                ProductStock ps = productStockRepository.findByProductId(item.getProductId())
                        .stream().findFirst().orElse(null);
                int finishedStock = ps != null && ps.getQuantity() != null ? ps.getQuantity() : 0;
                int finishedReserved = ps != null && ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
                int finishedAvail = Math.max(0, finishedStock - finishedReserved);

                if (remaining == 0) {
                    itemDtos.add(ProductionPlanningDTO.ItemPlanDTO.builder()
                            .orderItemId(item.getProductId())
                            .productName(item.getProductName())
                            .orderedQuantity(item.getQuantity())
                            .finishedStockAvailable(finishedAvail)
                            .remainingToProduce(0)
                            .producibleQuantityNow(0)
                            .simulationOrderIndex(0)
                            .blockedByPreviousOrders(false)
                            .productionStatus("COVERED")
                            .canStartProduction(false)
                            .simulationMessage("Order item is fully covered by allocated stock.")
                            .materials(new ArrayList<>())
                            .build());
                    continue;
                }

                if (item.getRelatedProductionId() != null) {
                    itemDtos.add(ProductionPlanningDTO.ItemPlanDTO.builder()
                            .orderItemId(item.getProductId())
                            .productName(item.getProductName())
                            .orderedQuantity(item.getQuantity())
                            .finishedStockAvailable(finishedAvail)
                            .remainingToProduce(0)
                            .producibleQuantityNow(0)
                            .simulationOrderIndex(0)
                            .blockedByPreviousOrders(false)
                            .productionStatus("IN_PRODUCTION")
                            .canStartProduction(false)
                            .simulationMessage("Production already started (ID: " + item.getRelatedProductionId() + ")")
                            .materials(new ArrayList<>())
                            .build());
                    continue;
                }

                simIndex++;
                List<ProductionPlanningDTO.MaterialSimDTO> matDtos = new ArrayList<>();
                int producibleQty = remaining;
                String productionStatus = "NO_BOM";
                BomCalculationResultDto bom = null;

                try {
                    bom = technicalSheetModuleService.calculateBom(
                            item.getProductId(), remaining, orgId);
                    if (bom != null && bom.getMaterials() != null && !bom.getMaterials().isEmpty()) {
                        for (BomMaterialLineDto mat : bom.getMaterials()) {
                            double required = mat.getRequiredQuantity();
                            double qpu = mat.getQuantityPerUnit();

                            double effectiveQpu = remaining > 0 && qpu > 0
                                    ? required / remaining
                                    : qpu;

                            double[] poolEntry = materialPool.get(mat.getMaterialId());
                            double poolAvail = poolEntry != null ? poolEntry[0] : 0.0;

                            int maxFromMat = effectiveQpu > 0
                                    ? (int) Math.floor(poolAvail / effectiveQpu)
                                    : (poolAvail >= required ? remaining : 0);
                            producibleQty = Math.min(producibleQty, maxFromMat);

                            boolean enoughForFull = poolAvail >= required;
                            boolean limiting = maxFromMat < remaining;

                            double consumed = Math.min(required, poolAvail);
                            if (poolEntry != null) {
                                poolEntry[0] = poolAvail - consumed;
                            }

                            matDtos.add(ProductionPlanningDTO.MaterialSimDTO.builder()
                                    .materialId(mat.getMaterialId())
                                    .materialName(materialName.getOrDefault(mat.getMaterialId(), mat.getMaterialName()))
                                    .unit(materialUnit.getOrDefault(mat.getMaterialId(), mat.getUnit()))
                                    .materialPerProduct(qpu)
                                    .availableInStock((int) poolAvail)
                                    .neededForFullOrder(required)
                                    .willConsumeIfChosen(consumed)
                                    .missingAfterThisProduction(Math.max(0, required - consumed))
                                    .availableBefore(poolAvail)
                                    .availableAfterSimulation(poolAvail - consumed)
                                    .enoughForFullOrder(enoughForFull)
                                    .limitingMaterial(limiting)
                                    .build());

                            totalMatRequired.merge(mat.getMaterialId(), required, Double::sum);
                        }

                        if (producibleQty >= remaining) productionStatus = "READY_FOR_PRODUCTION";
                        else if (producibleQty > 0)      productionStatus = "PARTIALLY_PRODUCIBLE";
                        else                              productionStatus = "MATERIALS_MISSING";
                    }
                } catch (Exception e) {
                    log.warn("BOM calc failed for product {} in order {}: {}", item.getProductId(), order.getId(), e.getMessage());
                    producibleQty = 0;
                    productionStatus = "NO_BOM";
                }

                boolean blockedByPreviousOrders = producibleQty < remaining
                        && bom != null && bom.getMaterials() != null && !bom.getMaterials().isEmpty()
                        && bom.getMaterials().stream()
                            .allMatch(mat -> initialStock.getOrDefault(mat.getMaterialId(), 0.0) >= mat.getRequiredQuantity());

                StringBuilder simMsg = new StringBuilder();
                if (blockedByPreviousOrders) {
                    simMsg.append("Blocked by previous simulated orders. Reorder priority or process another order first. ");
                }
                simMsg.append("If you consume [");
                if (!matDtos.isEmpty()) {
                    simMsg.append(matDtos.stream()
                            .map(m -> m.getMaterialName() + ": " + m.getWillConsumeIfChosen())
                            .collect(Collectors.joining(", ")));
                }
                simMsg.append("], you can produce ").append(producibleQty)
                        .append("/").append(remaining)
                        .append(" units of ").append(item.getProductName()).append(".");

                itemDtos.add(ProductionPlanningDTO.ItemPlanDTO.builder()
                        .orderItemId(item.getProductId())
                        .productName(item.getProductName())
                        .orderedQuantity(item.getQuantity())
                        .finishedStockAvailable(finishedAvail)
                        .remainingToProduce(remaining)
                        .producibleQuantityNow(producibleQty)
                        .simulationOrderIndex(simIndex)
                        .blockedByPreviousOrders(blockedByPreviousOrders)
                        .productionStatus(productionStatus)
                        .canStartProduction(producibleQty > 0)
                        .simulationMessage(simMsg.toString())
                        .materials(matDtos)
                        .build());
            }

            orderDtos.add(ProductionPlanningDTO.OrderPlanDTO.builder()
                    .orderId(order.getId())
                    .orderCode(order.getOrderReference())
                    .clientEmail(order.getClientId())
                    .status(order.getStatus() != null ? order.getStatus().name() : null)
                    .requestedDeliveryDate(order.getRequestedDeliveryDate())
                    .confirmedDeliveryDate(order.getConfirmedDeliveryDate())
                    .deliveryDateConfirmed(order.getConfirmedDeliveryDate() != null)
                    .items(itemDtos)
                    .build());
        }

        List<ProductionPlanningDTO.GlobalMatLineDTO> globalLines = new ArrayList<>();
        for (Map.Entry<String, Double> entry : totalMatRequired.entrySet()) {
            String mid = entry.getKey();
            double required = entry.getValue();
            double avail = initialStock.getOrDefault(mid, 0.0);
            globalLines.add(ProductionPlanningDTO.GlobalMatLineDTO.builder()
                    .materialName(materialName.getOrDefault(mid, mid))
                    .unit(materialUnit.getOrDefault(mid, ""))
                    .totalRequired(required)
                    .available(avail)
                    .missing(Math.max(0, required - avail))
                    .build());
        }

        ProductionPlanningDTO.AiRecommendationDTO aiRec = null;
        try {
            aiRec = aiProductionPlanningService.recommend(orderDtos);
        } catch (Exception e) {
            log.warn("AI recommendation call failed: {}", e.getMessage());
        }

        return ProductionPlanningDTO.builder()
                .orders(orderDtos)
                .globalSummary(ProductionPlanningDTO.GlobalMaterialSummaryDTO.builder()
                        .materials(globalLines)
                        .build())
                .aiRecommendation(aiRec)
                .build();
    }

    @Transactional
    public void confirmDeliveryDate(String orderId, LocalDate confirmedDate, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new com.dppsmart.dppsmart.Common.Exceptions.NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException("Access denied");

        LocalDate prevDate = order.getConfirmedDeliveryDate();

        order.setConfirmedDeliveryDate(confirmedDate);
        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());
        ordersRepository.save(order);

        auditService.log("Order", orderId, "CONFIRM_DELIVERY_DATE", order.getOrganizationId(), Map.of("previousDate", prevDate),
                "Delivery date confirmed: " + confirmedDate);
    }

    private String resolveOrgId(User user) {
        if (user.getOrganizationId() != null) return user.getOrganizationId();
        if (user.getAssignedOrganizationIds() != null && !user.getAssignedOrganizationIds().isEmpty())
            return user.getAssignedOrganizationIds().get(0);
        throw new BadRequestException("No organization found for user");
    }
}
