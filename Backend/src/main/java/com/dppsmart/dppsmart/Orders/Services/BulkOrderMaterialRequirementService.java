package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO.OrderAllocation;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementRequestDTO.ProductPriorityAllocation;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.AffectedOrderItem;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.MaterialRequirement;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.ProductSummary;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
        for (String id : orderIds) {
            ordersRepository.findById(id).ifPresent(o -> ordersById.put(id, o));
        }

        Map<String, Map<String, Integer>> allocationIndex = new HashMap<>();
        for (ProductPriorityAllocation pa : priorityAllocations) {
            Map<String, Integer> byOrder = new LinkedHashMap<>();
            for (OrderAllocation oa : pa.getAllocations()) {
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