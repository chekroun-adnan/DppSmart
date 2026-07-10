package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Orders.Entities.MaterialCostLineSnapshot;
import com.dppsmart.dppsmart.Orders.Entities.OperationCostLineSnapshot;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.*;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CostCalculationService {

    private final TechnicalSheetRepository technicalSheetRepository;
    private final MaterialSheetItemRepository materialSheetItemRepository;
    private final OperationSheetItemRepository operationSheetItemRepository;
    private final OperationRepository operationRepository;
    private final MaterialStockRepository materialStockRepository;

    public EstimatedCostResult calculateEstimatedUnitPrice(String productId, String organizationId) {
        OrderCostBreakdown breakdown = calculateOrderCostBreakdown(productId, 1, organizationId);
        return new EstimatedCostResult(
                breakdown.unitManufacturingCost(),
                breakdown.currency(),
                breakdown.materialCostPerUnit(),
                breakdown.operationCostPerUnit(),
                breakdown.hasMaterialSheet(),
                breakdown.hasOperationSheet()
        );
    }

    public OrderCostBreakdown calculateOrderCostBreakdown(String productId, int orderQuantity, String organizationId) {
        double materialCostPerUnit = 0;
        double operationCostPerUnit = 0;
        double totalDurationPerUnit = 0;
        String currency = "MAD";
        boolean hasMaterialSheet = false;
        boolean hasOperationSheet = false;
        List<MaterialCostLineSnapshot> materialLines = new ArrayList<>();
        List<OperationCostLineSnapshot> operationLines = new ArrayList<>();

        Optional<TechnicalSheet> materialSheet = technicalSheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(
                        productId, TechnicalSheetType.MATERIAL_SHEET, TechnicalSheetStatus.ACTIVE);

        if (materialSheet.isPresent()) {
            hasMaterialSheet = true;
            List<MaterialSheetItem> items = materialSheetItemRepository
                    .findByTechnicalSheetId(materialSheet.get().getId());

            for (MaterialSheetItem item : items) {
                double qpu = item.getQuantityPerUnit() != null ? item.getQuantityPerUnit() : 0.0;
                double waste = item.getWastePercentage() != null ? item.getWastePercentage() : 0.0;
                double requiredPerUnit = qpu * (1.0 + waste / 100.0);

                Double stockPrice = 0.0;
                String lineCurrency = "MAD";
                String matName = item.getMaterialName() != null ? item.getMaterialName() : "—";
                String unit = item.getUnit() != null ? item.getUnit() : "";
                String matId = item.getMaterialId() != null ? item.getMaterialId() : item.getId();

                Double sheetPrice = item.getUnitPrice();
                String sheetCurrency = item.getCostCurrency();
                
                if (item.getMaterialId() != null) {
                    Optional<MaterialStock> stock = materialStockRepository.findById(item.getMaterialId());
                    if (stock.isPresent()) {
                        matName = stock.get().getName();
                        unit = stock.get().getUnit() != null ? stock.get().getUnit() : unit;
                    }
                }
                
                if (sheetPrice == null) sheetPrice = 0.0;
                if (sheetCurrency == null) sheetCurrency = "MAD";

                double lineCostPerUnit = requiredPerUnit * sheetPrice;
                double lineCostTotal = lineCostPerUnit * orderQuantity;
                materialCostPerUnit += lineCostPerUnit;

                MaterialCostLineSnapshot line = new MaterialCostLineSnapshot();
                line.setMaterialId(matId);
                line.setMaterialName(matName);
                line.setUnit(unit);
                line.setQuantityPerUnit(qpu);
                line.setWastePercentage(waste > 0 ? waste : null);
                line.setUnitPrice(sheetPrice);
                line.setCostCurrency(sheetCurrency);
                line.setMaterialCostPerUnit(round2(lineCostPerUnit));
                line.setMaterialCostTotal(round2(lineCostTotal));
                materialLines.add(line);
            }
        }

        Optional<TechnicalSheet> operationSheet = technicalSheetRepository
                .findFirstByProductIdAndTypeAndStatusOrderByVersionDesc(
                        productId, TechnicalSheetType.OPERATION_SHEET, TechnicalSheetStatus.ACTIVE);

        if (operationSheet.isPresent()) {
            hasOperationSheet = true;
            List<OperationSheetItem> ops = operationSheetItemRepository
                    .findByTechnicalSheetIdOrderByStepOrderAsc(operationSheet.get().getId());

            for (OperationSheetItem opItem : ops) {
                Operation op = opItem.getOperationId() != null
                        ? operationRepository.findById(opItem.getOperationId()).orElse(null) : null;

                double durationMinutes = resolveDurationMinutes(opItem, op);
                Double sheetRate = opItem.getCostPerMinute();
                String sheetCurrency = opItem.getCostCurrency();
                
                double rate = sheetRate != null ? sheetRate : 0.0;
                String lineCurrency = sheetCurrency != null ? sheetCurrency : "MAD";

                double costPerUnit = durationMinutes * rate;
                double requiredTimeMinutes = durationMinutes * orderQuantity;
                double operationCostTotal = requiredTimeMinutes * rate;

                operationCostPerUnit += costPerUnit;
                totalDurationPerUnit += durationMinutes;

                String department = opItem.getAssignedDepartment() != null
                        ? opItem.getAssignedDepartment()
                        : (op != null ? op.getResponsibleDepartment() : null);

                OperationCostLineSnapshot line = new OperationCostLineSnapshot();
                line.setOperationId(opItem.getOperationId());
                line.setOperationName(opItem.getOperationName() != null ? opItem.getOperationName()
                        : (op != null ? op.getName() : "—"));
                line.setDepartment(department);
                line.setDurationPerUnit(round2(durationMinutes));
                line.setDurationUnit("MINUTES");
                line.setCostPerMinute(rate);
                line.setCostPerUnit(round2(costPerUnit));
                line.setRequiredTimeMinutes(round2(requiredTimeMinutes));
                line.setCostCurrency(lineCurrency);
                line.setOperationCostTotal(round2(operationCostTotal));
                operationLines.add(line);
            }
        }

        double unitManufacturingCost = materialCostPerUnit + operationCostPerUnit;
        double materialCostTotal = materialCostPerUnit * orderQuantity;
        double operationCostTotal = operationCostPerUnit * orderQuantity;

        if (!hasMaterialSheet && !hasOperationSheet) {
            log.warn("No technical sheets found for product {} in org {}", productId, organizationId);
        }

        return new OrderCostBreakdown(
                round2(materialCostPerUnit),
                round2(operationCostPerUnit),
                round2(unitManufacturingCost),
                round2(materialCostTotal),
                round2(operationCostTotal),
                round2(materialCostTotal + operationCostTotal),
                round2(totalDurationPerUnit),
                operationLines.size(),
                currency,
                hasMaterialSheet,
                hasOperationSheet,
                materialLines,
                operationLines
        );
    }

    /** Duration per product in minutes from technical sheet item or operation defaults. */
    public static double resolveDurationMinutes(OperationSheetItem opItem, Operation op) {
        Double raw = opItem != null ? opItem.getDurationEstimate() : null;
        if (raw == null && op != null) {
            raw = op.getDefaultDuration();
            if (raw == null) {
                raw = op.getEstimatedDuration();
            }
        }
        if (raw == null) {
            return 0.0;
        }
        String unit = op != null && op.getDurationUnit() != null ? op.getDurationUnit() : "MINUTES";
        return toMinutes(raw, unit);
    }

    public static double toMinutes(double value, String unit) {
        if (unit == null || "MINUTES".equalsIgnoreCase(unit)) {
            return value;
        }
        if ("HOURS".equalsIgnoreCase(unit)) {
            return value * 60.0;
        }
        if ("DAYS".equalsIgnoreCase(unit)) {
            return value * 480.0;
        }
        return value;
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public record EstimatedCostResult(
            double estimatedUnitPrice,
            String currency,
            double materialCostPerUnit,
            double operationCostPerUnit,
            boolean hasMaterialSheet,
            boolean hasOperationSheet
    ) {}

    public record OrderCostBreakdown(
            double materialCostPerUnit,
            double operationCostPerUnit,
            double unitManufacturingCost,
            double materialCostTotal,
            double operationCostTotal,
            double totalManufacturingCost,
            double totalDurationPerUnit,
            int operationCount,
            String currency,
            boolean hasMaterialSheet,
            boolean hasOperationSheet,
            List<MaterialCostLineSnapshot> materialLines,
            List<OperationCostLineSnapshot> operationLines
    ) {}
}
