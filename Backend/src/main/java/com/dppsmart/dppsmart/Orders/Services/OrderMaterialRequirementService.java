package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Orders.DTO.BulkRequirementsResponseDTO;
import com.dppsmart.dppsmart.Orders.DTO.MaterialRequirementDTO;
import com.dppsmart.dppsmart.Orders.DTO.OrderItemRequirementResponse;
import com.dppsmart.dppsmart.Orders.DTO.SupplyChainOrderRequestDTO;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderItemStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.SupplyChain.DTO.CreateMaterialOrderDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.MaterialOrderResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.Services.MaterialOrderService;
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
public class OrderMaterialRequirementService {

    private final OrdersRepository ordersRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final MaterialOrderService materialOrderService;
    private final GroqOrderAnalysisService groqOrderAnalysisService;

    private static final Set<ClientOrderStatus> ACTIVE_STATUSES = Set.of(
            ClientOrderStatus.PENDING_REVIEW,
            ClientOrderStatus.READY_FOR_CONFIRMATION,
            ClientOrderStatus.DATE_CHANGE_REQUESTED,
            ClientOrderStatus.CONFIRMED,
            ClientOrderStatus.IN_PRODUCTION
    );

    public OrderItemRequirementResponse getRequirements(String orderId, int itemIndex) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        if (itemIndex < 0 || itemIndex >= order.getItems().size())
            throw new NotFoundException("Item index out of bounds: " + itemIndex);

        OrderItem item = order.getItems().get(itemIndex);

        
        Optional<ProductStock> psOpt = productStockRepository.findByProductId(item.getProductId())
                .stream().findFirst();
        int availProd = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);
        int resvProd  = psOpt.map(ps -> ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0).orElse(0);
        int missingProd = Math.max(0, item.getQuantity() - Math.max(0, availProd - resvProd));

        var builder = OrderItemRequirementResponse.builder()
                .orderId(orderId)
                .orderReference(order.getOrderReference())
                .orderItemIndex(String.valueOf(itemIndex))
                .productId(item.getProductId())
                .productName(item.getProductName())
                .orderedQuantity(item.getQuantity())
                .availableProductStock(availProd)
                .reservedProductStock(resvProd)
                .missingProductQuantity(missingProd);

        if (missingProd == 0) {
            return builder
                    .materialRequirements(Collections.emptyList())
                    .aiSummary("Product stock is sufficient for this order item.")
                    .build();
        }

        Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                .findFirstByProductIdAndStatusOrderByVersionDesc(item.getProductId(), TechnicalSheetStatus.ACTIVE);
        if (sheetOpt.isEmpty()) {
            return builder
                    .errorMessage("No active technical sheet found for product: " + item.getProductName())
                    .materialRequirements(Collections.emptyList())
                    .build();
        }
        TechnicalSheet sheet = sheetOpt.get();
        builder.technicalSheetId(sheet.getId()).technicalSheetName(sheet.getName());

        List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());
        List<String> matIds = sheetItems.stream()
                .map(MaterialSheetItem::getMaterialId)
                .distinct()
                .collect(Collectors.toList());
        Map<String, MaterialStock> stockMap = materialStockRepository.findAllById(matIds).stream()
                .collect(Collectors.toMap(MaterialStock::getId, ms -> ms));

        Map<String, Double> crossShortfall = computeCrossOrderShortfall(orderId, item.getProductId(), matIds, stockMap);

        List<MaterialRequirementDTO> reqs = new ArrayList<>();
        for (MaterialSheetItem si : sheetItems) {
            MaterialStock ms = stockMap.get(si.getMaterialId());
            double qpu        = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
            double required   = round2(qpu * missingProd);
            int avail         = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
            double missing    = round2(Math.max(0.0, required - avail));
            double cross      = round2(crossShortfall.getOrDefault(si.getMaterialId(), 0.0));
            double recommended = round2(missing + cross);

            reqs.add(MaterialRequirementDTO.builder()
                    .materialId(si.getMaterialId())
                    .materialName(ms != null ? ms.getName() : (si.getMaterialName() != null ? si.getMaterialName() : "—"))
                    .referenceCode(ms != null ? ms.getReferenceCode() : "—")
                    .unit(si.getUnit() != null ? si.getUnit() : (ms != null ? ms.getUnit() : ""))
                    .quantityPerUnit(qpu)
                    .requiredQuantity(required)
                    .availableStock(avail)
                    .otherOrdersShortfall(cross)
                    .missingQuantity(missing)
                    .recommendedOrderQuantity(recommended)
                    .status(missing <= 0.0 ? "AVAILABLE" : "INSUFFICIENT")
                    .build());
        }

        String summary = groqOrderAnalysisService.generateSummary(order, item, missingProd, sheet, reqs);
        return builder.materialRequirements(reqs).aiSummary(summary).build();
    }

    public BulkRequirementsResponseDTO getBulkRequirements(List<String> orderIds) {
        
        
        Map<String, Double> totalRequired = new LinkedHashMap<>();
        Map<String, MaterialStock> stockCache = new HashMap<>();
        List<BulkRequirementsResponseDTO.OrderSummaryDTO> summaries = new ArrayList<>();
        int itemsWithRequirements = 0;

        for (String orderId : orderIds) {
            Orders order = ordersRepository.findById(orderId).orElse(null);
            if (order == null) continue;

            for (int idx = 0; idx < order.getItems().size(); idx++) {
                OrderItem item = order.getItems().get(idx);

                Optional<ProductStock> psOpt = productStockRepository.findByProductId(item.getProductId())
                        .stream().findFirst();
                int availProd  = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);
                int resvProd   = psOpt.map(ps -> ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0).orElse(0);
                int missingProd = Math.max(0, item.getQuantity() - Math.max(0, availProd - resvProd));

                if (missingProd == 0) {
                    summaries.add(BulkRequirementsResponseDTO.OrderSummaryDTO.builder()
                            .orderId(orderId)
                            .orderReference(order.getOrderReference())
                            .productName(item.getProductName())
                            .orderedQuantity(item.getQuantity())
                            .missingProductQuantity(0)
                            .build());
                    continue;
                }

                Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                        .findFirstByProductIdAndStatusOrderByVersionDesc(item.getProductId(), TechnicalSheetStatus.ACTIVE);
                if (sheetOpt.isEmpty()) {
                    summaries.add(BulkRequirementsResponseDTO.OrderSummaryDTO.builder()
                            .orderId(orderId)
                            .orderReference(order.getOrderReference())
                            .productName(item.getProductName())
                            .orderedQuantity(item.getQuantity())
                            .missingProductQuantity(missingProd)
                            .errorMessage("No active technical sheet for: " + item.getProductName())
                            .build());
                    continue;
                }

                TechnicalSheet sheet = sheetOpt.get();
                List<MaterialSheetItem> sheetItems = materialSheetItemRepository.findByTechnicalSheetId(sheet.getId());

                for (MaterialSheetItem si : sheetItems) {
                    double qpu = si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0;
                    double needed = round2(qpu * missingProd);
                    if (needed <= 0) continue;

                    totalRequired.merge(si.getMaterialId(), needed, (a, b) -> round2(a + b));
                    if (!stockCache.containsKey(si.getMaterialId())) {
                        materialStockRepository.findById(si.getMaterialId()).ifPresent(ms -> stockCache.put(ms.getId(), ms));
                    }
                }

                summaries.add(BulkRequirementsResponseDTO.OrderSummaryDTO.builder()
                        .orderId(orderId)
                        .orderReference(order.getOrderReference())
                        .productName(item.getProductName())
                        .orderedQuantity(item.getQuantity())
                        .missingProductQuantity(missingProd)
                        .build());
                itemsWithRequirements++;
            }
        }

        List<BulkRequirementsResponseDTO.AggregatedMaterialDTO> aggregated = totalRequired.entrySet().stream()
                .map(e -> {
                    String mid = e.getKey();
                    double required = e.getValue();
                    MaterialStock ms = stockCache.get(mid);
                    int avail = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                    double remaining = round2(Math.max(0.0, avail - required));
                    double missing   = round2(Math.max(0.0, required - avail));
                    return BulkRequirementsResponseDTO.AggregatedMaterialDTO.builder()
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
                .sorted(Comparator.comparing(m -> !"INSUFFICIENT".equals(m.getStatus()) ? 1 : 0))
                .collect(Collectors.toList());

        return BulkRequirementsResponseDTO.builder()
                .orderIds(orderIds)
                .orderSummaries(summaries)
                .aggregatedMaterials(aggregated)
                .totalOrdersProcessed(orderIds.size())
                .totalItemsWithRequirements(itemsWithRequirements)
                .build();
    }

    public MaterialOrderResponseDTO createSupplyChainOrder(String orderId, int itemIndex,
                                                           SupplyChainOrderRequestDTO dto) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (itemIndex < 0 || itemIndex >= order.getItems().size())
            throw new NotFoundException("Item index out of bounds: " + itemIndex);

        String notes = (dto.getNotes() != null ? dto.getNotes() : "")
                + "\n[Linked to client order: " + order.getOrderReference() + "]";

        CreateMaterialOrderDTO createDto = new CreateMaterialOrderDTO();
        createDto.setSupplierId(dto.getSupplierId());
        createDto.setOrganizationId(dto.getOrganizationId() != null ? dto.getOrganizationId() : order.getOrganizationId());
        createDto.setExpectedDeliveryDate(dto.getExpectedDeliveryDate());
        createDto.setNotes(notes.trim());
        createDto.setItems(dto.getItems().stream().map(li -> {
            CreateMaterialOrderDTO.CreateMaterialOrderItemDTO i = new CreateMaterialOrderDTO.CreateMaterialOrderItemDTO();
            i.setMaterialId(li.getMaterialId());
            i.setMaterialName(li.getMaterialName());
            i.setMaterialReference(li.getMaterialReference());
            i.setOrderedQuantity(li.getOrderedQuantity());
            i.setUnit(li.getUnit());
            i.setNotes(li.getNotes());
            i.setUnitPrice(0);
            return i;
        }).collect(Collectors.toList()));

        return materialOrderService.createOrder(createDto);
    }

    private Map<String, Double> computeCrossOrderShortfall(String excludeOrderId, String productId,
                                                            List<String> matIds, Map<String, MaterialStock> stockMap) {
        Map<String, Double> result = new HashMap<>();
        for (String mid : matIds) result.put(mid, 0.0);

        Optional<TechnicalSheet> sheetOpt = technicalSheetRepository
                .findFirstByProductIdAndStatusOrderByVersionDesc(productId, TechnicalSheetStatus.ACTIVE);
        if (sheetOpt.isEmpty()) return result;

        Map<String, Double> qpuMap = materialSheetItemRepository.findByTechnicalSheetId(sheetOpt.get().getId())
                .stream().filter(si -> matIds.contains(si.getMaterialId()))
                .collect(Collectors.toMap(MaterialSheetItem::getMaterialId,
                        si -> si.getQuantityPerUnit() != null ? si.getQuantityPerUnit() : 0.0));

        
        Optional<ProductStock> psOpt = productStockRepository.findByProductId(productId)
                .stream().findFirst();
        int baseAvail    = psOpt.map(ps -> ps.getQuantity() != null ? ps.getQuantity() : 0).orElse(0);
        int baseReserved = psOpt.map(ps -> ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0).orElse(0);
        int freeProduct  = Math.max(0, baseAvail - baseReserved);

        ordersRepository.findAll().stream()
                .filter(o -> !o.getId().equals(excludeOrderId) && ACTIVE_STATUSES.contains(o.getStatus()))
                .flatMap(o -> o.getItems().stream()
                        .filter(oi -> productId.equals(oi.getProductId())
                                && (oi.getStatus() == OrderItemStatus.OUT_OF_STOCK
                                    || oi.getStatus() == OrderItemStatus.TO_PRODUCE)))
                .forEach(oi -> {
                    int missing = Math.max(0, oi.getQuantity() - freeProduct);
                    if (missing == 0) return;
                    for (String mid : matIds) {
                        double qpu = qpuMap.getOrDefault(mid, 0.0);
                        MaterialStock ms = stockMap.get(mid);
                        int matAvail = ms != null && ms.getQuantity() != null ? ms.getQuantity() : 0;
                        int matResv  = ms != null && ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
                        double shortfall = Math.max(0.0, qpu * missing - Math.max(0.0, matAvail - matResv));
                        result.merge(mid, shortfall, Double::sum);
                    }
                });

        result.replaceAll((k, v) -> round2(v));
        return result;
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
