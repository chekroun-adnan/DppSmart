package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO.ProductPriorityAllocation;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.AffectedOrderItem;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.MaterialRequirement;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.ProductSummary;
import com.dppsmart.dppsmart.Orders.DTO.SequentialAllocationResponse;
import com.dppsmart.dppsmart.Orders.DTO.SequentialAllocationResponse.GlobalMaterialLine;
import com.dppsmart.dppsmart.Orders.DTO.SequentialAllocationResponse.MaterialAllocation;
import com.dppsmart.dppsmart.Orders.DTO.SequentialAllocationResponse.OrderAllocation;
import com.dppsmart.dppsmart.Orders.DTO.SequentialAllocationResponse.SimulationSummary;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BulkOrderMaterialRequirementService {

    private final OrdersRepository ordersRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final GroqBulkSummaryService groqBulkSummaryService;
    private final OrderPriorityService orderPriorityService;
    private final OrganizationRepository organizationRepository;

    public BulkOrderRequirementResponseDTO calculate(List<String> orderIds) {
        return compute(orderIds, Collections.emptyList(), false);
    }

    public BulkOrderRequirementResponseDTO recalculate(BulkOrderRequirementRequestDTO req) {
        return compute(req.getOrderIds(),
                req.getPriorityAllocations() != null ? req.getPriorityAllocations() : Collections.emptyList(),
                true);
    }

    private BulkOrderRequirementResponseDTO compute(List<String> orderIds,
                                                    List<ProductPriorityAllocation> priorityAllocations,
                                                    boolean priorityAllocated) {

        Map<String, Orders> ordersById = new LinkedHashMap<>();
        List<Orders> sortedOrders = orderPriorityService.sortForProduction(
                orderIds.stream()
                        .map(id -> ordersRepository.findById(id).orElse(null))
                        .filter(Objects::nonNull)
                        .toList());
        for (Orders o : sortedOrders) {
            ordersById.put(o.getId(), o);
        }

        Map<String, Map<String, Integer>> allocationIndex = new HashMap<>();
        for (ProductPriorityAllocation pa : priorityAllocations) {
            Map<String, Integer> byOrder = new LinkedHashMap<>();
            for (BulkOrderRequirementRequestDTO.OrderAllocation oa : pa.getAllocations()) {
                byOrder.put(oa.getOrderId(), Math.max(0, oa.getAllocatedFromStock()));
            }
            allocationIndex.put(pa.getProductId(), byOrder);
        }

        Map<String, List<OrderItemEntry>> byProduct = new LinkedHashMap<>();
        for (Orders order : ordersById.values()) {
            for (OrderItem item : order.getItems()) {
                byProduct
                    .computeIfAbsent(item.getProductId(), k -> new ArrayList<>())
                    .add(new OrderItemEntry(order, item));
            }
        }

        List<ProductSummary> productSummaries = new ArrayList<>();
        Map<String, Double> totalMatRequired = new LinkedHashMap<>();
        Map<String, MaterialStock> matStockCache = new HashMap<>();

        Map<String, double[]> materialPool = new HashMap<>();
        Set<String> allMaterialIds = new HashSet<>();
        for (List<OrderItemEntry> productEntries : byProduct.values()) {
            if (productEntries.isEmpty()) continue;
            String pid = productEntries.get(0).item.getProductId();
            technicalSheetRepository.findByProductIdAndStatus(pid, TechnicalSheetStatus.ACTIVE)
                    .ifPresent(sheet -> {
                        List<MaterialSheetItem> items = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                        for (MaterialSheetItem si : items) {
                            if (si.getMaterialId() != null) allMaterialIds.add(si.getMaterialId());
                        }
                    });
        }
        for (String mid : allMaterialIds) {
            MaterialStock ms = materialStockRepository.findById(mid).orElse(null);
            int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
            int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            double avail = Math.max(0, physQty - resQty);
            materialPool.put(mid, new double[]{avail});
            if (ms != null) matStockCache.put(mid, ms);
        }

        for (Map.Entry<String, List<OrderItemEntry>> entry : byProduct.entrySet()) {
            String productId = entry.getKey();
            List<OrderItemEntry> entries = entry.getValue();

            String productName = entries.get(0).item.getProductName();

            int totalRequested = entries.stream().mapToInt(e -> e.item.getQuantity()).sum();

            Optional<ProductStock> psOpt = productStockRepository.findByProductId(productId)
                    .stream().findFirst();
            int availableStock = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);

            String sheetId = null, sheetName = null, errorMessage = null;
            List<MaterialSheetItem> bomItems = List.of();
            Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                    .findByProductIdAndStatus(productId, TechnicalSheetStatus.ACTIVE);
            if (sheetOpt.isPresent()) {
                TechnicalSheet sheet = sheetOpt.get();
                sheetId = sheet.getId();
                sheetName = sheet.getName();
                bomItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
            } else {
                errorMessage = "No active technical sheet for: " + productName;
            }

            int allocatedTotal;
            List<AffectedOrderItem> affectedOrders;

            if (priorityAllocated && allocationIndex.containsKey(productId)) {
                Map<String, Integer> allocMap = allocationIndex.get(productId);
                affectedOrders = new ArrayList<>();
                int priorityCounter = 1;
                for (OrderItemEntry e : entries) {
                    int alloc = Math.min(
                        e.item.getQuantity(),
                        Math.max(0, allocMap.getOrDefault(e.order.getId(), 0))
                    );
                    int toProduce = e.item.getQuantity() - alloc;
                    affectedOrders.add(buildOrderItem(e.order, e.item, alloc, toProduce, priorityCounter++, bomItems, materialPool, totalMatRequired, matStockCache).build());
                }
                allocatedTotal = affectedOrders.stream().mapToInt(AffectedOrderItem::getAllocatedFromStock).sum();

            } else {
                affectedOrders = new ArrayList<>();
                int remainingStock = availableStock;
                int priorityCounter = 1;
                for (OrderItemEntry e : entries) {
                    int alloc = Math.min(e.item.getQuantity(), Math.max(0, remainingStock));
                    remainingStock -= alloc;
                    int toProduce = e.item.getQuantity() - alloc;
                    Map<String, double[]> itemPool = cloneMaterialPool(materialPool);
                    affectedOrders.add(buildOrderItem(e.order, e.item, alloc, toProduce, priorityCounter++, bomItems, itemPool, totalMatRequired, matStockCache).build());
                }
                allocatedTotal = affectedOrders.stream().mapToInt(AffectedOrderItem::getAllocatedFromStock).sum();
            }

            int missingQtyToProduce = Math.max(0, totalRequested - allocatedTotal);
            boolean stockSufficient = missingQtyToProduce == 0;

            productSummaries.add(ProductSummary.builder()
                    .productId(productId)
                    .productName(entries.get(0).item.getProductName())
                    .totalRequestedQuantity(totalRequested)
                    .availableProductStock(availableStock)
                    .allocatedFromStock(allocatedTotal)
                    .missingQuantityToProduce(missingQtyToProduce)
                    .stockSufficient(stockSufficient)
                    .technicalSheetId(sheetId)
                    .technicalSheetName(sheetName)
                    .errorMessage(errorMessage)
                    .affectedOrders(affectedOrders)
                    .build());
        }

        List<MaterialRequirement> aggregatedMaterials = totalMatRequired.entrySet().stream()
                .map(e -> {
                    String mid = e.getKey();
                    double required = e.getValue();
                    MaterialStock ms = matStockCache.get(mid);
                    int avail = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                    double remaining = round2(Math.max(0.0, avail - required));
                    double missing = round2(Math.max(0.0, required - avail));
                    return MaterialRequirement.builder()
                            .materialId(mid)
                            .materialName(ms != null ? ms.getName() : mid)
                            .referenceCode(ms != null ? ms.getReferenceCode() : "—")
                            .unit(ms != null ? ms.getUnit() : "")
                            .totalRequiredQuantity(required)
                            .availableStock(avail)
                            .remainingAfter(remaining)
                            .missingQuantity(missing)
                            .status(missing <= 0.0 ? "AVAILABLE" : "INSUFFICIENT")
                            .build();
                })
                .sorted(Comparator.comparingInt(m -> "INSUFFICIENT".equals(m.getStatus()) ? 0 : 1))
                .collect(Collectors.toList());

        boolean allStockSufficient = productSummaries.stream().allMatch(ProductSummary::isStockSufficient);
        int totalNeedingProduction = (int) productSummaries.stream()
                .filter(p -> !p.isStockSufficient()).count();

        String aiSummary = groqBulkSummaryService.generateSummary(
                orderIds.size(), productSummaries, aggregatedMaterials);

        return BulkOrderRequirementResponseDTO.builder()
                .selectedOrderIds(orderIds)
                .productSummaries(productSummaries)
                .aggregatedMaterials(aggregatedMaterials)
                .allStockSufficient(allStockSufficient)
                .priorityAllocated(priorityAllocated)
                .aiSummary(aiSummary)
                .totalOrdersProcessed(orderIds.size())
                .totalProductsNeedingProduction(totalNeedingProduction)
                .build();
    }

    public SequentialAllocationResponse calculateSequential(List<String> orderIds) {
        List<Orders> allOrders = orderIds.stream()
                .map(id -> ordersRepository.findById(id).orElse(null))
                .filter(Objects::nonNull)
                .toList();

        List<Orders> sortedOrders = orderPriorityService.sortForProduction(allOrders);

        Map<String, double[]> productPool = new HashMap<>();
        Map<String, double[]> materialPool = new HashMap<>();
        Map<String, MaterialStock> matStockCache = new HashMap<>();
        Map<String, String> matNameCache = new HashMap<>();
        Map<String, String> matUnitCache = new HashMap<>();
        Map<String, String> orgNameCache = new HashMap<>();

        for (Orders order : sortedOrders) {
            for (OrderItem item : order.getItems()) {
                if (!productPool.containsKey(item.getProductId())) {
                    int stock = productStockRepository.findByProductId(item.getProductId()).stream()
                            .findFirst().map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);
                    productPool.put(item.getProductId(), new double[]{stock});
                }
            }
        }

        Set<String> allMaterialIds = new HashSet<>();
        for (Orders order : sortedOrders) {
            for (OrderItem item : order.getItems()) {
                technicalSheetRepository.findByProductIdAndStatus(item.getProductId(), TechnicalSheetStatus.ACTIVE)
                        .ifPresent(sheet -> {
                            List<MaterialSheetItem> items = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
                            for (MaterialSheetItem si : items) {
                                if (si.getMaterialId() != null) allMaterialIds.add(si.getMaterialId());
                            }
                        });
            }
        }
        for (String mid : allMaterialIds) {
            MaterialStock ms = materialStockRepository.findById(mid).orElse(null);
            int physQty = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
            int resQty = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            double avail = Math.max(0, physQty - resQty);
            materialPool.put(mid, new double[]{avail});
            if (ms != null) {
                matStockCache.put(mid, ms);
                matNameCache.put(mid, ms.getName() != null ? ms.getName() : mid);
                matUnitCache.put(mid, ms.getUnit() != null ? ms.getUnit() : "");
            }
        }

        Map<String, Double> initialMaterialStock = new LinkedHashMap<>();
        for (Map.Entry<String, double[]> e : materialPool.entrySet()) {
            initialMaterialStock.put(e.getKey(), e.getValue()[0]);
        }

        List<OrderAllocation> orderAllocations = new ArrayList<>();
        Map<String, Double> globalTotalRequired = new LinkedHashMap<>();
        Map<String, Double> globalTotalAllocated = new LinkedHashMap<>();
        Map<String, Double> globalTotalMissing = new LinkedHashMap<>();
        int rank = 1;

        for (Orders order : sortedOrders) {
            String orgName = orgNameCache.computeIfAbsent(order.getOrganizationId(), id ->
                    organizationRepository.findById(id).map(o -> o.getName() != null ? o.getName() : id).orElse(id));

            LocalDate deliveryDate = order.getConfirmedDeliveryDate() != null ? order.getConfirmedDeliveryDate()
                    : order.getProposedDeliveryDate() != null ? order.getProposedDeliveryDate()
                    : order.getRequestedDeliveryDate();
            String deliveryDateStr = deliveryDate != null ? deliveryDate.toString() : null;
            long daysUntil = deliveryDate != null ? ChronoUnit.DAYS.between(LocalDate.now(), deliveryDate) : 999;
            String priorityLevel = computePriorityBadgeFromDays(daysUntil);

            List<MaterialAllocation> orderMats = new ArrayList<>();
            boolean allFullyAllocated = true;
            boolean anyAllocated = false;
            String warningMsg = null;

            for (OrderItem item : order.getItems()) {
                String pid = item.getProductId();
                double[] prodPoolEntry = productPool.get(pid);
                double prodAvail = prodPoolEntry != null ? prodPoolEntry[0] : 0;

                int needQty = item.getQuantity() != null ? item.getQuantity() : 0;
                double fromStock = Math.min(needQty, prodAvail);
                if (prodPoolEntry != null) {
                    prodPoolEntry[0] -= fromStock;
                }

                if (fromStock > 0) {
                    orderMats.add(MaterialAllocation.builder()
                            .materialId(pid)
                            .materialName(item.getProductName() != null ? item.getProductName() : pid)
                            .unit("units")
                            .requiredQuantity(needQty)
                            .availableBefore(prodAvail)
                            .allocatedQuantity(fromStock)
                            .remainingAfter(prodPoolEntry != null ? prodPoolEntry[0] : 0)
                            .missingQuantity(0)
                            .allocationSource("FINISHED_PRODUCT_STOCK")
                            .productId(pid)
                            .productName(item.getProductName())
                            .build());
                }

                double toProduce = needQty - fromStock;

                if (toProduce > 0) {
                    Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                            .findByProductIdAndStatus(pid, TechnicalSheetStatus.ACTIVE);
                    if (sheetOpt.isPresent()) {
                        List<MaterialSheetItem> bomItems = materialSheetItemRepository
                                .findByTechnicalSheetId(sheetOpt.get().getId());

                        double producibleQty = toProduce;
                        for (MaterialSheetItem si : bomItems) {
                            double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                            if (qpu <= 0) continue;
                            double waste = si.getWastePercentage() != null ? si.getWastePercentage() : 0.0;
                            double neededPerUnit = qpu * (1.0 + waste / 100.0);
                            double[] poolEntry = materialPool.get(si.getMaterialId());
                            double poolAvail = poolEntry != null ? poolEntry[0] : 0.0;
                            int maxFromThisMat = (int) Math.floor(poolAvail / neededPerUnit);
                            producibleQty = Math.min(producibleQty, maxFromThisMat);
                        }

                        double actualToProduce = Math.min(toProduce, producibleQty);
                        if (actualToProduce < toProduce) allFullyAllocated = false;
                        if (actualToProduce > 0) anyAllocated = true;

                        for (MaterialSheetItem si : bomItems) {
                            double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                            if (qpu <= 0) continue;
                            double waste = si.getWastePercentage() != null ? si.getWastePercentage() : 0.0;
                            double neededPerUnit = qpu * (1.0 + waste / 100.0);
                            double neededFull = round2(toProduce * neededPerUnit);
                            double willConsume = round2(actualToProduce * neededPerUnit);
                            double[] poolEntry = materialPool.get(si.getMaterialId());
                            double poolAvail = poolEntry != null ? poolEntry[0] : 0.0;
                            double remainingAfter = Math.max(0, poolAvail - willConsume);
                            double missing = round2(Math.max(0, neededFull - poolAvail));

                            if (poolEntry != null) poolEntry[0] = remainingAfter;

                            String matName = matNameCache.getOrDefault(si.getMaterialId(),
                                    si.getMaterialName() != null ? si.getMaterialName() : si.getMaterialId());
                            String matUnit = matUnitCache.getOrDefault(si.getMaterialId(),
                                    si.getUnit() != null ? si.getUnit() : "");

                            orderMats.add(MaterialAllocation.builder()
                                    .materialId(si.getMaterialId())
                                    .materialName(matName)
                                    .unit(matUnit)
                                    .requiredQuantity(neededFull)
                                    .availableBefore(poolAvail)
                                    .allocatedQuantity(willConsume)
                                    .remainingAfter(remainingAfter)
                                    .missingQuantity(missing)
                                    .allocationSource("RAW_MATERIAL_STOCK")
                                    .productId(pid)
                                    .productName(item.getProductName())
                                    .build());

                            globalTotalRequired.merge(si.getMaterialId(), neededFull, (a, b) -> round2(a + b));
                            globalTotalAllocated.merge(si.getMaterialId(), willConsume, (a, b) -> round2(a + b));
                            globalTotalMissing.merge(si.getMaterialId(), missing, (a, b) -> round2(a + b));
                        }
                    } else {
                        allFullyAllocated = false;
                        orderMats.add(MaterialAllocation.builder()
                                .materialId(pid)
                                .materialName(item.getProductName() != null ? item.getProductName() : pid)
                                .unit("units")
                                .requiredQuantity(toProduce)
                                .availableBefore(0)
                                .allocatedQuantity(0)
                                .remainingAfter(0)
                                .missingQuantity(toProduce)
                                .allocationSource("RAW_MATERIAL_STOCK")
                                .productId(pid)
                                .productName(item.getProductName())
                                .build());
                    }
                }
            }

            String allocationStatus;
            if (!anyAllocated && orderMats.stream().anyMatch(m -> m.getMissingQuantity() > 0)) {
                boolean hasBomError = orderMats.stream().anyMatch(m ->
                        m.getAllocationSource().equals("RAW_MATERIAL_STOCK") && m.getAllocatedQuantity() == 0
                                && m.getMissingQuantity() > 0);
                if (hasBomError) {
                    allocationStatus = "MATERIAL_SHORTAGE";
                } else if (orderMats.isEmpty() || orderMats.stream().allMatch(m -> m.getRequiredQuantity() == 0)) {
                    allocationStatus = "READY_FOR_DELIVERY";
                } else {
                    allocationStatus = "NOT_ALLOCATED";
                }
            } else if (allFullyAllocated && orderMats.stream().anyMatch(m -> m.getAllocationSource().equals("RAW_MATERIAL_STOCK"))) {
                allocationStatus = "READY_FOR_PRODUCTION";
            } else if (allFullyAllocated && !anyAllocated) {
                allocationStatus = "READY_FOR_DELIVERY";
            } else if (anyAllocated && !allFullyAllocated) {
                allocationStatus = "PARTIALLY_ALLOCATED";
                warningMsg = "This order is only partially allocated. Missing materials must be resolved before starting full production.";
            } else {
                allocationStatus = "FULLY_ALLOCATED";
            }

            boolean hasMissingMats = orderMats.stream().anyMatch(m -> m.getMissingQuantity() > 0);
            if (allocationStatus.equals("READY_FOR_PRODUCTION") && hasMissingMats) {
                allocationStatus = "PARTIALLY_ALLOCATED";
                warningMsg = "This order is only partially allocated. Missing materials must be resolved before starting full production.";
            }

            List<String> missingMaterials = orderMats.stream()
                    .filter(m -> "RAW_MATERIAL_STOCK".equals(m.getAllocationSource()) && m.getMissingQuantity() > 0)
                    .map(MaterialAllocation::getMaterialName)
                    .collect(Collectors.toList());
            List<String> missingProducts = orderMats.stream()
                    .filter(m -> "FINISHED_PRODUCT_STOCK".equals(m.getAllocationSource()) && m.getMissingQuantity() > 0)
                    .map(MaterialAllocation::getMaterialName)
                    .collect(Collectors.toList());
            boolean hasFullyMissing = orderMats.stream().noneMatch(m -> m.getAllocatedQuantity() > 0);

            String readinessStatus;
            boolean canSendToDelivery = false;
            boolean canStartProduction = false;
            boolean canStartPartialProduction = false;

            if ("READY_FOR_DELIVERY".equals(allocationStatus)) {
                readinessStatus = "READY_FOR_DELIVERY";
                canSendToDelivery = !hasMissingMats;
            } else if ("READY_FOR_PRODUCTION".equals(allocationStatus)) {
                readinessStatus = "READY_FOR_PRODUCTION";
                canStartProduction = !hasMissingMats;
            } else if ("PARTIALLY_ALLOCATED".equals(allocationStatus)) {
                boolean someProductionPossible = orderMats.stream().anyMatch(m ->
                        "RAW_MATERIAL_STOCK".equals(m.getAllocationSource()) && m.getAllocatedQuantity() > 0);
                if (someProductionPossible) {
                    readinessStatus = "PARTIALLY_PRODUCIBLE";
                    canStartPartialProduction = true;
                } else {
                    readinessStatus = "MATERIAL_SHORTAGE";
                }
            } else if ("MATERIAL_SHORTAGE".equals(allocationStatus) || ("NOT_ALLOCATED".equals(allocationStatus) && hasFullyMissing)) {
                readinessStatus = "MATERIAL_SHORTAGE";
            } else if ("NOT_ALLOCATED".equals(allocationStatus)) {
                readinessStatus = "BLOCKED";
            } else if ("FULLY_ALLOCATED".equals(allocationStatus)) {
                readinessStatus = "READY_FOR_PRODUCTION";
                canStartProduction = true;
            } else {
                readinessStatus = allocationStatus;
            }

            orderAllocations.add(OrderAllocation.builder()
                    .orderId(order.getId())
                    .orderReference(order.getOrderReference())
                    .organizationName(orgName)
                    .deliveryDate(deliveryDateStr)
                    .priorityLevel(priorityLevel)
                    .priorityRank(rank++)
                    .allocationStatus(allocationStatus)
                    .readinessStatus(readinessStatus)
                    .canSendToDelivery(canSendToDelivery)
                    .canStartProduction(canStartProduction)
                    .canStartPartialProduction(canStartPartialProduction)
                    .missingMaterials(missingMaterials)
                    .missingProducts(missingProducts)
                    .materials(orderMats)
                    .warningMessage(warningMsg)
                    .build());
        }

        List<GlobalMaterialLine> globalLines = new ArrayList<>();
        for (Map.Entry<String, double[]> e : materialPool.entrySet()) {
            String mid = e.getKey();
            double initial = initialMaterialStock.getOrDefault(mid, 0.0);
            double required = globalTotalRequired.getOrDefault(mid, 0.0);
            double allocated = globalTotalAllocated.getOrDefault(mid, 0.0);
            double missing = globalTotalMissing.getOrDefault(mid, 0.0);
            double remaining = e.getValue()[0];
            globalLines.add(GlobalMaterialLine.builder()
                    .materialId(mid)
                    .materialName(matNameCache.getOrDefault(mid, mid))
                    .unit(matUnitCache.getOrDefault(mid, ""))
                    .initialStock(initial)
                    .totalRequired(required)
                    .totalAllocated(allocated)
                    .totalMissing(missing)
                    .finalRemainingStock(remaining)
                    .build());
        }

        double totalRequired = globalLines.stream().mapToDouble(GlobalMaterialLine::getTotalRequired).sum();
        double totalAllocatedSum = globalLines.stream().mapToDouble(GlobalMaterialLine::getTotalAllocated).sum();
        double totalMissingSum = globalLines.stream().mapToDouble(GlobalMaterialLine::getTotalMissing).sum();

        SimulationSummary simSummary = SimulationSummary.builder()
                .initialStock(initialMaterialStock)
                .totalRequired(round2(totalRequired))
                .totalAllocated(round2(totalAllocatedSum))
                .totalMissing(round2(totalMissingSum))
                .finalRemainingStock(materialPool.entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue()[0])))
                .build();

        return SequentialAllocationResponse.builder()
                .orders(orderAllocations)
                .materialSummary(globalLines)
                .simulationSummary(simSummary)
                .build();
    }

    private String computePriorityBadgeFromDays(long daysUntil) {
        if (daysUntil < 0) return "LATE";
        if (daysUntil <= 1) return "HIGH";
        if (daysUntil <= 7) return "MEDIUM";
        return "LOW";
    }

    private record OrderItemEntry(Orders order, OrderItem item) {}

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private Map<String, double[]> cloneMaterialPool(Map<String, double[]> pool) {
        Map<String, double[]> clone = new HashMap<>();
        for (Map.Entry<String, double[]> e : pool.entrySet()) {
            clone.put(e.getKey(), new double[]{e.getValue()[0]});
        }
        return clone;
    }

    private AffectedOrderItem.AffectedOrderItemBuilder buildOrderItem(
            Orders order, OrderItem item, int alloc, int toProduce, int priority,
            List<MaterialSheetItem> bomItems,
            Map<String, double[]> materialPool,
            Map<String, Double> totalMatRequired,
            Map<String, MaterialStock> matStockCache) {

        List<MaterialRequirement> itemMats = new ArrayList<>();
        int producibleQty = toProduce;
        String prodStatus = "NO_BOM";

        if (toProduce > 0 && !bomItems.isEmpty()) {
            for (MaterialSheetItem si : bomItems) {
                double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                double waste = si.getWastePercentage() != null ? si.getWastePercentage() : 0.0;
                double needed = round2(toProduce * qpu * (1.0 + waste / 100.0));
                if (needed <= 0) continue;

                double[] poolEntry = materialPool.get(si.getMaterialId());
                double poolAvail = poolEntry != null ? poolEntry[0] : 0.0;

                int maxFromThisMat = qpu > 0
                    ? (int) Math.floor(poolAvail / qpu)
                    : 0;
                producibleQty = Math.min(producibleQty, maxFromThisMat);
            }

            for (MaterialSheetItem si : bomItems) {
                double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                double waste = si.getWastePercentage() != null ? si.getWastePercentage() : 0.0;
                double needed = round2(toProduce * qpu * (1.0 + waste / 100.0));
                if (needed <= 0) continue;

                double[] poolEntry = materialPool.get(si.getMaterialId());
                double poolAvail = poolEntry != null ? poolEntry[0] : 0.0;

                double willConsume = round2(producibleQty * qpu * (1.0 + waste / 100.0));
                double availableAfter = Math.max(0, poolAvail - willConsume);
                double missingForFullOrder = Math.max(0, needed - poolAvail);
                boolean enough = poolAvail >= needed;

                MaterialStock ms = matStockCache.get(si.getMaterialId());
                if (ms == null) {
                    ms = materialStockRepository.findById(si.getMaterialId()).orElse(null);
                    if (ms != null) matStockCache.put(si.getMaterialId(), ms);
                }
                String matName = ms != null ? ms.getName() : si.getMaterialName();
                String matUnit = ms != null ? ms.getUnit() : si.getUnit();
                String refCode = ms != null ? ms.getReferenceCode() : "—";
                int initialAvail = ms != null ? Math.max(0, (ms.getQuantity() != null ? ms.getQuantity() : 0)
                        - (ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0)) : 0;

                if (poolEntry != null) {
                    poolEntry[0] = availableAfter;
                }

                itemMats.add(MaterialRequirement.builder()
                        .materialId(si.getMaterialId())
                        .materialName(matName)
                        .referenceCode(refCode)
                        .unit(matUnit)
                        .quantityPerUnit(qpu)
                        .totalRequiredQuantity(needed)
                        .availableStock(initialAvail)
                        .remainingAfter(availableAfter)
                        .missingQuantity(missingForFullOrder)
                        .status(enough ? "AVAILABLE" : "INSUFFICIENT")
                        .willConsumeIfChosen(willConsume)
                        .availableBefore(poolAvail)
                        .availableAfterSimulation(availableAfter)
                        .build());

                totalMatRequired.merge(si.getMaterialId(), needed, (a, a2) -> round2(a + a2));
            }

            if (producibleQty >= toProduce) prodStatus = "READY_FOR_PRODUCTION";
            else if (producibleQty > 0)      prodStatus = "PARTIALLY_PRODUCIBLE";
            else                              prodStatus = "MATERIALS_MISSING";

        } else if (toProduce > 0 && bomItems.isEmpty()) {
            prodStatus = "NO_BOM";
        }

        String statusLabel = toProduce == 0 ? "FROM_STOCK"
                : alloc > 0 ? "PARTIAL" : "NEEDS_PRODUCTION";

        return AffectedOrderItem.builder()
                .orderId(order.getId())
                .orderReference(order.getOrderReference())
                .orderedQuantity(item.getQuantity())
                .allocatedFromStock(alloc)
                .quantityToProduce(toProduce)
                .priority(priority)
                .status(statusLabel)
                .materialRequirements(itemMats)
                .productionStatus(prodStatus)
                .producibleQuantityNow(producibleQty)
                .canStartProduction(producibleQty > 0);
    }
}