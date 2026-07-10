package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.TechnicalSheetIssue;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.TechnicalSheetValidationResult;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetStatus;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheetType;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationSheetItemRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.TechnicalSheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TechnicalSheetValidationService {

    private final TechnicalSheetRepository sheetRepository;
    private final MaterialSheetItemRepository materialItemRepository;
    private final OperationSheetItemRepository operationItemRepository;
    private final ProductRepository productRepository;
    private final OrdersRepository ordersRepository;

    public TechnicalSheetValidationResult validateProductTechnicalSheet(String productId) {
        return validateProduct(productId, null, null);
    }

    public TechnicalSheetValidationResult validateOrderTechnicalSheets(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        List<TechnicalSheetIssue> allIssues = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            allIssues.addAll(validateProduct(item.getProductId(), orderId, order.getOrderReference()).getIssues());
        }

        boolean hasCritical = allIssues.stream().anyMatch(i -> "CRITICAL".equalsIgnoreCase(i.getSeverity()));
        return new TechnicalSheetValidationResult(
                !hasCritical,
                orderId,
                order.getOrderReference(),
                allIssues
        );
    }

    public List<TechnicalSheetValidationResult> validateOrdersTechnicalSheets(List<String> orderIds) {
        List<TechnicalSheetValidationResult> results = new ArrayList<>();
        for (String orderId : orderIds) {
            results.add(validateOrderTechnicalSheets(orderId));
        }
        return results;
    }

    private TechnicalSheetValidationResult validateProduct(String productId, String orderId, String orderNumber) {
        boolean isClientSupplied = false;
        if (orderId != null) {
            Optional<Orders> orderOpt = ordersRepository.findById(orderId);
            if (orderOpt.isPresent() && orderOpt.get().getManufacturingMode() == com.dppsmart.dppsmart.Orders.Entities.ManufacturingMode.CLIENT_SUPPLIED_MATERIALS) {
                isClientSupplied = true;
            }
        }
        List<TechnicalSheetIssue> issues = new ArrayList<>();
        String productName = resolveProductName(productId);

        Optional<TechnicalSheet> materialSheet = sheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(productId, TechnicalSheetType.MATERIAL_SHEET, TechnicalSheetStatus.ACTIVE);

        if (materialSheet.isEmpty()) {
            if (!isClientSupplied) {
                issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                        "MISSING_MATERIAL_SHEET",
                        "Product " + productName + " has no material sheet (BOM) defined."));
            }
        } else {
            List<MaterialSheetItem> materialItems = materialItemRepository.findByTechnicalSheetId(materialSheet.get().getId());
            if (materialItems.isEmpty()) {
                if (!isClientSupplied) {
                    issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                            "EMPTY_MATERIAL_SHEET",
                            "Product " + productName + " has no materials declared in its material sheet."));
                }
            } else {
                for (int i = 0; i < materialItems.size(); i++) {
                    MaterialSheetItem mi = materialItems.get(i);
                    if (mi.getMaterialId() == null || mi.getMaterialId().isBlank()) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "WARNING",
                                "INVALID_MATERIAL_QUANTITY",
                                "Product " + productName + " material #" + (i + 1) + " has no material selected."));
                    }
                    if (mi.getQuantityPerUnit() == null || mi.getQuantityPerUnit() <= 0) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "WARNING",
                                "INVALID_MATERIAL_QUANTITY",
                                "Product " + productName + " material '" + (mi.getMaterialName() != null ? mi.getMaterialName() : "#" + (i + 1)) + "' has invalid quantity per unit."));
                    }
                    if (mi.getUnit() == null || mi.getUnit().isBlank()) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "WARNING",
                                "INVALID_MATERIAL_QUANTITY",
                                "Product " + productName + " material '" + (mi.getMaterialName() != null ? mi.getMaterialName() : "#" + (i + 1)) + "' has no unit defined."));
                    }
                }
            }
        }

        Optional<TechnicalSheet> operationSheet = sheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(productId, TechnicalSheetType.OPERATION_SHEET, TechnicalSheetStatus.ACTIVE);

        if (operationSheet.isEmpty()) {
            issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                    "MISSING_OPERATION_SHEET",
                    "Product " + productName + " has no operation sheet defined."));
        } else {
            List<OperationSheetItem> opItems = operationItemRepository.findByTechnicalSheetIdOrderByStepOrderAsc(operationSheet.get().getId());
            if (opItems.isEmpty()) {
                issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                        "EMPTY_OPERATION_SHEET",
                        "Product " + productName + " has no operations declared in its operation sheet."));
            } else {
                for (int i = 0; i < opItems.size(); i++) {
                    OperationSheetItem oi = opItems.get(i);
                    if (oi.getOperationId() == null || oi.getOperationId().isBlank()) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                                "INVALID_OPERATION_DURATION",
                                "Product " + productName + " operation #" + (i + 1) + " has no operation selected."));
                    }
                    if (oi.getStepOrder() == null) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "WARNING",
                                "INVALID_OPERATION_SEQUENCE",
                                "Product " + productName + " operation #" + (i + 1) + " has no sequence order."));
                    }
                    if (oi.getDurationEstimate() == null || oi.getDurationEstimate() <= 0) {
                        issues.add(new TechnicalSheetIssue(productId, productName, "WARNING",
                                "INVALID_OPERATION_DURATION",
                                "Product " + productName + " operation #" + (i + 1) + " has no estimated duration."));
                    }
                }
            }
        }

        if (!materialSheet.isPresent() && !operationSheet.isPresent()) {
            issues.add(new TechnicalSheetIssue(productId, productName, "CRITICAL",
                    "MISSING_TECHNICAL_SHEET",
                    "Product " + productName + " has no technical sheet defined."));
        }

        boolean hasCritical = issues.stream().anyMatch(i -> "CRITICAL".equalsIgnoreCase(i.getSeverity()));

        return new TechnicalSheetValidationResult(
                !hasCritical,
                orderId,
                orderNumber,
                issues
        );
    }

    private String resolveProductName(String productId) {
        return productRepository.findById(productId)
                .map(p -> p.getProductName() != null ? p.getProductName() : productId)
                .orElse(productId);
    }
}
