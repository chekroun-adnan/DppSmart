package com.dppsmart.dppsmart.SecurityAlert.Services;

import com.dppsmart.dppsmart.SecurityAlert.Entities.SecurityAlert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class RuleDetectionService {

    private static final int LARGE_STOCK_DECREASE_THRESHOLD = 100;
    private static final int REPEATED_CORRECTIONS_WINDOW_HOURS = 24;
    private static final int REPEATED_CORRECTIONS_MIN_COUNT = 3;
    private static final int UNUSUAL_ORDER_MIN_QTY = 10000;
    private static final int REPEATED_LOGIN_FAILURES = 10;
    private static final int LOGIN_WINDOW_MINUTES = 30;
    private static final int SUPPLIER_DELAY_THRESHOLD_DAYS = 3;
    private static final int QR_REPEATED_SCAN_SECONDS = 10;

    public SecurityAlert detectAuthAnomaly(String email, String ip, int recentFailures,
                                            String userAgent, String organizationId) {
        if (recentFailures >= REPEATED_LOGIN_FAILURES) {
            return createAlert("BRUTE_FORCE_LOGIN", "AUTH", severity(75), 75,
                    email, null, organizationId,
                    "Brute force login attempt detected",
                    String.format("%d failed login attempts for %s from IP %s in %d minutes",
                            recentFailures, email, ip, LOGIN_WINDOW_MINUTES));
        }
        if (recentFailures >= 5 && recentFailures < REPEATED_LOGIN_FAILURES) {
            return createAlert("SUSPICIOUS_LOGIN", "AUTH", SecurityAlert.Severity.MEDIUM, 40,
                    email, null, organizationId,
                    "Multiple failed login attempts",
                    String.format("%d failed login attempts for %s from IP %s",
                            recentFailures, email, ip));
        }
        return null;
    }

    public SecurityAlert detectStockAnomaly(String materialId, String materialName,
                                             int quantityBefore, int quantityAfter,
                                             String organizationId, String userId,
                                             List<Map<String, Object>> recentChanges) {
        int delta = quantityBefore - quantityAfter;
        if (delta >= LARGE_STOCK_DECREASE_THRESHOLD) {
            return createAlert("LARGE_STOCK_DECREASE", "STOCK",
                    delta >= 500 ? SecurityAlert.Severity.HIGH : SecurityAlert.Severity.MEDIUM,
                    delta >= 500 ? 70 : 45,
                    materialId, userId, organizationId,
                    "Large stock decrease: " + materialName,
                    String.format("%s decreased by %d units (from %d to %d)",
                            materialName, delta, quantityBefore, quantityAfter));
        }

        if (delta < 0) {
            return createAlert("NEGATIVE_STOCK_ATTEMPT", "STOCK", SecurityAlert.Severity.HIGH, 65,
                    materialId, userId, organizationId,
                    "Negative stock attempt: " + materialName,
                    String.format("Attempt to set %s below zero (%d → %d)",
                            materialName, quantityBefore, quantityAfter));
        }

        if (recentChanges != null && recentChanges.size() >= REPEATED_CORRECTIONS_MIN_COUNT) {
            long recentCount = recentChanges.stream()
                    .filter(m -> {
                        Object ts = m.get("timestamp");
                        if (ts == null) return false;
                        try {
                            LocalDateTime t = LocalDateTime.parse(ts.toString());
                            return t.isAfter(LocalDateTime.now().minusHours(REPEATED_CORRECTIONS_WINDOW_HOURS));
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .count();
            if (recentCount >= REPEATED_CORRECTIONS_MIN_COUNT) {
                return createAlert("REPEATED_STOCK_CORRECTIONS", "STOCK",
                        SecurityAlert.Severity.MEDIUM, 50,
                        materialId, userId, organizationId,
                        "Repeated stock corrections: " + materialName,
                        String.format("%d stock adjustments for %s in %d hours",
                                recentCount, materialName, REPEATED_CORRECTIONS_WINDOW_HOURS));
            }
        }
        return null;
    }

    public SecurityAlert detectSupplierAnomaly(String orderId, String supplierName,
                                                int quantityOrdered, int quantityDelivered,
                                                boolean isDelayed, int recentDelays,
                                                String organizationId) {
        if (quantityOrdered > 0 && quantityDelivered != quantityOrdered) {
            int mismatchPct = Math.abs(quantityDelivered - quantityOrdered) * 100 / quantityOrdered;
            if (mismatchPct > 20) {
                return createAlert("DELIVERY_QUANTITY_MISMATCH", "SUPPLIER",
                        mismatchPct > 50 ? SecurityAlert.Severity.HIGH : SecurityAlert.Severity.MEDIUM,
                        mismatchPct > 50 ? 70 : 45,
                        orderId, null, organizationId,
                        "Delivery quantity mismatch: " + supplierName,
                        String.format("Ordered %d, delivered %d (%d%% mismatch)",
                                quantityOrdered, quantityDelivered, mismatchPct));
            }
        }

        if (isDelayed) {
            return createAlert("SUPPLIER_DELAY", "SUPPLIER",
                    recentDelays >= 3 ? SecurityAlert.Severity.HIGH : SecurityAlert.Severity.MEDIUM,
                    recentDelays >= 3 ? 65 : 40,
                    orderId, null, organizationId,
                    "Supplier delivery delay: " + supplierName,
                    String.format("%s order %s is delayed. Recent delays: %d",
                            supplierName, orderId, recentDelays));
        }

        if (recentDelays >= 5) {
            return createAlert("REPEATED_SUPPLIER_INCIDENTS", "SUPPLIER",
                    SecurityAlert.Severity.HIGH, 75,
                    orderId, null, organizationId,
                    "Repeated supplier incidents: " + supplierName,
                    String.format("%s has %d recent delays or mismatches", supplierName, recentDelays));
        }
        return null;
    }

    public SecurityAlert detectOrderAnomaly(String orderId, int quantity,
                                             boolean isPriority, String productName,
                                             String organizationId, String userId) {
        if (quantity >= UNUSUAL_ORDER_MIN_QTY) {
            return createAlert("ABNORMAL_ORDER_QUANTITY", "ORDER",
                    quantity >= 50000 ? SecurityAlert.Severity.HIGH : SecurityAlert.Severity.MEDIUM,
                    quantity >= 50000 ? 70 : 45,
                    orderId, userId, organizationId,
                    "Abnormal order quantity: " + productName,
                    String.format("Order quantity %d for %s exceeds threshold of %d",
                            quantity, productName, UNUSUAL_ORDER_MIN_QTY));
        }
        return null;
    }

    public SecurityAlert detectQrScanAnomaly(String productId, String ip,
                                              boolean signatureValid, boolean isRepeated,
                                              boolean isExpired, int recentScans,
                                              String organizationId) {
        if (Boolean.FALSE.equals(signatureValid)) {
            return createAlert("INVALID_QR_SIGNATURE", "QR_SCAN",
                    SecurityAlert.Severity.HIGH, 70,
                    productId, null, organizationId,
                    "Invalid QR signature detected",
                    String.format("Product %s was scanned with an invalid QR signature from IP %s",
                            productId, ip));
        }
        if (isExpired) {
            return createAlert("EXPIRED_QR_USAGE", "QR_SCAN",
                    SecurityAlert.Severity.MEDIUM, 40,
                    productId, null, organizationId,
                    "Expired QR code used",
                    String.format("Product %s was scanned with an expired QR code from IP %s",
                            productId, ip));
        }
        if (isRepeated) {
            return createAlert("REPEATED_QR_SCAN", "QR_SCAN",
                    SecurityAlert.Severity.LOW, 25,
                    productId, null, organizationId,
                    "Repeated QR scan detected",
                    String.format("Product %s scanned repeatedly from IP %s", productId, ip));
        }
        if (recentScans > 20) {
            return createAlert("RAPID_QR_SCANS", "QR_SCAN",
                    SecurityAlert.Severity.MEDIUM, 45,
                    productId, null, organizationId,
                    "Rapid QR scans detected",
                    String.format("%d scans for product %s from IP %s in the last hour",
                            recentScans, productId, ip));
        }
        return null;
    }

    public SecurityAlert detectProductionAnomaly(String productionId, String productName,
                                                   int quantity, boolean isCancelled,
                                                   String organizationId, String userId) {
        if (isCancelled) {
            return createAlert("PRODUCTION_CANCELLATION", "PRODUCTION",
                    SecurityAlert.Severity.MEDIUM, 35,
                    productionId, userId, organizationId,
                    "Production cancelled: " + productName,
                    String.format("Production %s (%s) was cancelled", productionId, productName));
        }
        if (quantity > 1000) {
            return createAlert("UNUSUAL_PRODUCTION_QUANTITY", "PRODUCTION",
                    SecurityAlert.Severity.LOW, 20,
                    productionId, userId, organizationId,
                    "Unusual production quantity: " + productName,
                    String.format("Production quantity %d for %s is unusually high", quantity, productName));
        }
        return null;
    }

    private SecurityAlert createAlert(String type, String module,
                                       SecurityAlert.Severity severity, int riskScore,
                                       String entityId, String userId,
                                       String organizationId,
                                       String description, String ruleReason) {
        SecurityAlert alert = new SecurityAlert();
        alert.setId(com.aventrix.jnanoid.jnanoid.NanoIdUtils.randomNanoId());
        alert.setType(type);
        alert.setSourceModule(module);
        alert.setSeverity(severity);
        alert.setRiskScore(riskScore);
        alert.setEntityId(entityId);
        alert.setUserId(userId);
        alert.setOrganizationId(organizationId);
        alert.setDescription(description);
        alert.setRuleBasedReason(ruleReason);
        alert.setStatus(SecurityAlert.AlertStatus.OPEN);
        alert.setCreatedAt(LocalDateTime.now());
        return alert;
    }

    private SecurityAlert.Severity severity(int riskScore) {
        if (riskScore >= 70) return SecurityAlert.Severity.HIGH;
        if (riskScore >= 40) return SecurityAlert.Severity.MEDIUM;
        return SecurityAlert.Severity.LOW;
    }
}
