package com.dppsmart.dppsmart.Allocation.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Allocation.Entities.StockReservation;
import com.dppsmart.dppsmart.Allocation.Repositories.StockReservationRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import com.dppsmart.dppsmart.ProductStock.Repositories.ProductStockRepository;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final StockReservationRepository reservationRepository;
    private final ProductStockRepository productStockRepository;
    private final MaterialStockRepository materialStockRepository;
    private final StockMovementService stockMovementService;

    private static final int RESERVATION_TTL_MINUTES = 120;

    // ─── Reserve product stock (idempotent) ───────────────────────────────────

    /**
     * Reserves finished-product stock for an order.
     * Idempotent: if an ACTIVE reservation already exists for this orderId+productId,
     * the existing one is returned without creating a duplicate.
     */
    @Transactional
    public StockReservation reserveProductStock(String orderId, String productId,
                                                int quantity, String userId, String orgId) {
        // ── Idempotency check ────────────────────────────────────────────────
        List<StockReservation> existing = reservationRepository
                .findByOrderIdAndProductIdAndStatus(orderId, productId, StockReservation.ReservationStatus.ACTIVE);
        if (!existing.isEmpty()) {
            log.info("RESERVE PRODUCT SKIPPED (idempotent) — orderId={}, productId={}, existingReservations={}",
                    orderId, productId, existing.size());
            return existing.get(0);
        }

        ProductStock stock = productStockRepository.findByProductId(productId).stream().findFirst()
                .orElseThrow(() -> new BadRequestException("No product stock found for " + productId));

        int physical  = stock.getQuantity() != null ? stock.getQuantity() : 0;
        int reserved  = recalculateReservedQuantityProduct(productId); // use truth from DB
        int available = physical - reserved;

        log.info("RESERVE PRODUCT — orderId={}, product={}, physical={}, reserved={}, available={}, requested={}",
                orderId, stock.getProductName(), physical, reserved, available, quantity);

        if (quantity > available) {
            throw new BadRequestException("Cannot reserve " + quantity + " units of " + stock.getProductName()
                    + ". Only " + available + " available (physical=" + physical + ", reserved=" + reserved + ").");
        }

        // Persist reservation record first
        StockReservation reservation = new StockReservation();
        reservation.setId(NanoIdUtils.randomNanoId());
        reservation.setOrderId(orderId);
        reservation.setOrganizationId(orgId);
        reservation.setCreatedBy(userId);
        reservation.setType(StockReservation.ReservationType.FINISHED_PRODUCT);
        reservation.setProductId(productId);
        reservation.setQuantity(quantity);
        reservation.setStatus(StockReservation.ReservationStatus.ACTIVE);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setExpiresAt(LocalDateTime.now().plusMinutes(RESERVATION_TTL_MINUTES));
        StockReservation saved = reservationRepository.save(reservation);

        // Recalculate and sync reservedQuantity on the stock document
        syncProductReservedQuantity(productId, stock);

        stockMovementService.recordProductMovement(
                MovementType.PRODUCT_RESERVED, productId, stock.getProductName(),
                stock.getUnit(), quantity,
                physical - quantity, physical,
                orderId, null, orgId, userId);

        log.info("RESERVE PRODUCT OK — orderId={}, product={}, newReserved={}",
                orderId, stock.getProductName(), reserved + quantity);
        return saved;
    }

    // ─── Reserve material stock (idempotent) ──────────────────────────────────

    /**
     * Reserves raw-material stock for an order.
     * Idempotent: if an ACTIVE reservation already exists for this orderId+materialId, returns it.
     */
    @Transactional
    public StockReservation reserveMaterialStock(String orderId, String materialId,
                                                 int quantity, String userId, String orgId) {
        // ── Idempotency check ────────────────────────────────────────────────
        List<StockReservation> existing = reservationRepository
                .findByOrderIdAndMaterialIdAndStatus(orderId, materialId, StockReservation.ReservationStatus.ACTIVE);
        if (!existing.isEmpty()) {
            log.info("RESERVE MATERIAL SKIPPED (idempotent) — orderId={}, materialId={}, existingReservations={}",
                    orderId, materialId, existing.size());
            return existing.get(0);
        }

        MaterialStock stock = materialStockRepository.findById(materialId)
                .orElseThrow(() -> new BadRequestException("Material not found: " + materialId));

        int physical  = stock.getQuantity() != null ? stock.getQuantity() : 0;
        int reserved  = recalculateReservedQuantityMaterial(materialId); // use truth from DB
        int available = physical - reserved;

        log.info("RESERVE MATERIAL — orderId={}, material={}, physical={}, reserved={}, available={}, requested={}",
                orderId, stock.getName(), physical, reserved, available, quantity);

        if (quantity > available) {
            throw new BadRequestException("Cannot reserve " + quantity + " units of " + stock.getName()
                    + ". Only " + available + " available (physical=" + physical + ", reserved=" + reserved + ").");
        }

        // Persist reservation record first
        StockReservation reservation = new StockReservation();
        reservation.setId(NanoIdUtils.randomNanoId());
        reservation.setOrderId(orderId);
        reservation.setOrganizationId(orgId);
        reservation.setCreatedBy(userId);
        reservation.setType(StockReservation.ReservationType.RAW_MATERIAL);
        reservation.setMaterialId(materialId);
        reservation.setQuantity(quantity);
        reservation.setStatus(StockReservation.ReservationStatus.ACTIVE);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setExpiresAt(LocalDateTime.now().plusMinutes(RESERVATION_TTL_MINUTES));
        StockReservation saved = reservationRepository.save(reservation);

        // Recalculate and sync reservedQuantity on the stock document
        syncMaterialReservedQuantity(materialId, stock);

        stockMovementService.recordMaterialMovement(
                MovementType.MATERIAL_RESERVED, stock.getId(), stock.getName(),
                stock.getUnit(), quantity,
                physical - quantity, physical,
                orderId, null, orgId, userId);

        log.info("RESERVE MATERIAL OK — orderId={}, material={}, newReserved={}",
                orderId, stock.getName(), reserved + quantity);
        return saved;
    }

    // ─── Consume product reservations (on delivery) ───────────────────────────

    @Transactional
    public void consumeProductReservations(String orderId) {
        List<StockReservation> reservations = reservationRepository
                .findByOrderIdAndStatus(orderId, StockReservation.ReservationStatus.ACTIVE);
        for (StockReservation res : reservations) {
            if (res.getType() != StockReservation.ReservationType.FINISHED_PRODUCT) continue;
            productStockRepository.findByProductId(res.getProductId()).stream().findFirst().ifPresent(stock -> {
                int physical = stock.getQuantity() != null ? stock.getQuantity() : 0;
                int deduct   = Math.min(res.getQuantity(), physical);
                stock.setQuantity(physical - deduct);
                productStockRepository.save(stock);

                // Sync reserved after consuming
                syncProductReservedQuantity(res.getProductId(), stock);

                stockMovementService.recordProductMovement(
                        MovementType.PRODUCT_DECREASED, res.getProductId(), stock.getProductName(),
                        stock.getUnit(), deduct, physical, stock.getQuantity(),
                        orderId, null, stock.getOrganizationId(), res.getCreatedBy());

                log.info("CONSUME PRODUCT — orderId={}, product={}, deducted={}, newPhysical={}",
                        orderId, stock.getProductName(), deduct, stock.getQuantity());
            });
            res.setStatus(StockReservation.ReservationStatus.CONSUMED);
            res.setConsumedAt(LocalDateTime.now());
            reservationRepository.save(res);
        }
    }

    // ─── Consume material reservations (on production start) ─────────────────

    @Transactional
    public void consumeMaterialReservations(String orderId) {
        List<StockReservation> reservations = reservationRepository
                .findByOrderIdAndStatus(orderId, StockReservation.ReservationStatus.ACTIVE);
        for (StockReservation res : reservations) {
            if (res.getType() != StockReservation.ReservationType.RAW_MATERIAL) continue;
            materialStockRepository.findById(res.getMaterialId()).ifPresent(stock -> {
                int physical = stock.getQuantity() != null ? stock.getQuantity() : 0;
                int deduct   = Math.min(res.getQuantity(), physical);
                stock.setQuantity(physical - deduct);
                materialStockRepository.save(stock);

                // Sync reserved after consuming
                syncMaterialReservedQuantity(res.getMaterialId(), stock);

                stockMovementService.recordMaterialMovement(
                        MovementType.MATERIAL_DECREASED, stock.getId(), stock.getName(),
                        stock.getUnit(), deduct, physical, stock.getQuantity(),
                        orderId, null, stock.getOrganizationId(), res.getCreatedBy());

                log.info("CONSUME MATERIAL — orderId={}, material={}, deducted={}, newPhysical={}",
                        orderId, stock.getName(), deduct, stock.getQuantity());
            });
            res.setStatus(StockReservation.ReservationStatus.CONSUMED);
            res.setConsumedAt(LocalDateTime.now());
            reservationRepository.save(res);
        }
    }

    // ─── Release reservations (on cancel / reject) ────────────────────────────

    @Transactional
    public void releaseReservations(String orderId) {
        List<StockReservation> reservations = reservationRepository
                .findByOrderIdAndStatus(orderId, StockReservation.ReservationStatus.ACTIVE);
        log.info("RELEASE ALL — orderId={}, count={}", orderId, reservations.size());
        for (StockReservation res : reservations) {
            markReleasedAndSync(res, StockReservation.ReservationStatus.RELEASED);
        }
    }

    @Transactional
    public void cancelReservations(String orderId) {
        List<StockReservation> reservations = reservationRepository
                .findByOrderIdAndStatus(orderId, StockReservation.ReservationStatus.ACTIVE);
        log.info("CANCEL ALL — orderId={}, count={}", orderId, reservations.size());
        for (StockReservation res : reservations) {
            markReleasedAndSync(res, StockReservation.ReservationStatus.CANCELLED);
        }
    }

    @Transactional
    public void releaseSingleReservation(String reservationId) {
        StockReservation res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new BadRequestException("Reservation not found: " + reservationId));
        markReleasedAndSync(res, StockReservation.ReservationStatus.RELEASED);
    }

    // ─── Recalculate helpers (single source of truth) ────────────────────────

    /**
     * Calculates the true reservedQuantity for a material by summing all ACTIVE
     * StockReservation records. Updates the stock document if it differs.
     * Returns the recalculated value.
     */
    public int recalculateReservedQuantityMaterial(String materialId) {
        List<StockReservation> active = reservationRepository
                .findByMaterialIdAndStatus(materialId, StockReservation.ReservationStatus.ACTIVE);
        return active.stream().mapToInt(StockReservation::getQuantity).sum();
    }

    /**
     * Calculates the true reservedQuantity for a product by summing all ACTIVE
     * StockReservation records. Returns the recalculated value.
     */
    public int recalculateReservedQuantityProduct(String productId) {
        List<StockReservation> active = reservationRepository
                .findByProductIdAndStatus(productId, StockReservation.ReservationStatus.ACTIVE);
        return active.stream().mapToInt(StockReservation::getQuantity).sum();
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    public List<StockReservation> getReservationsForOrder(String orderId) {
        return reservationRepository.findByOrderId(orderId);
    }

    public int getActiveReservedProductQuantity(String productId) {
        return recalculateReservedQuantityProduct(productId);
    }

    public int getActiveReservedMaterialQuantity(String materialId) {
        return recalculateReservedQuantityMaterial(materialId);
    }

    // ─── Admin repair ─────────────────────────────────────────────────────────

    /**
     * Repairs ALL stock documents by recalculating reservedQuantity from ACTIVE
     * StockReservation records. Also removes duplicate ACTIVE reservations for the
     * same orderId+materialId/productId (keeps the first, cancels the rest).
     * Returns a summary of what was fixed.
     */
    @Transactional
    public RepairResult repairAllReservations() {
        int materialStocksFixed = 0;
        int productStocksFixed  = 0;
        int duplicatesRemoved   = 0;

        // ── 1. Remove duplicate ACTIVE material reservations ─────────────────
        List<StockReservation> allActiveMaterial = reservationRepository
                .findByMaterialIdAndStatus(null, StockReservation.ReservationStatus.ACTIVE); // all active
        // Query all active to detect duplicates
        List<StockReservation> allActive = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == StockReservation.ReservationStatus.ACTIVE)
                .toList();

        java.util.Map<String, List<StockReservation>> byOrderMaterial = new java.util.LinkedHashMap<>();
        java.util.Map<String, List<StockReservation>> byOrderProduct  = new java.util.LinkedHashMap<>();

        for (StockReservation r : allActive) {
            if (r.getType() == StockReservation.ReservationType.RAW_MATERIAL && r.getMaterialId() != null) {
                String key = r.getOrderId() + ":" + r.getMaterialId();
                byOrderMaterial.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
            } else if (r.getType() == StockReservation.ReservationType.FINISHED_PRODUCT && r.getProductId() != null) {
                String key = r.getOrderId() + ":" + r.getProductId();
                byOrderProduct.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
            }
        }

        for (List<StockReservation> group : byOrderMaterial.values()) {
            if (group.size() > 1) {
                // Keep first, cancel the rest
                for (int i = 1; i < group.size(); i++) {
                    StockReservation dup = group.get(i);
                    dup.setStatus(StockReservation.ReservationStatus.CANCELLED);
                    dup.setReleasedAt(LocalDateTime.now());
                    reservationRepository.save(dup);
                    duplicatesRemoved++;
                    log.warn("REPAIR: cancelled duplicate material reservation id={} orderId={} materialId={} qty={}",
                            dup.getId(), dup.getOrderId(), dup.getMaterialId(), dup.getQuantity());
                }
            }
        }

        for (List<StockReservation> group : byOrderProduct.values()) {
            if (group.size() > 1) {
                for (int i = 1; i < group.size(); i++) {
                    StockReservation dup = group.get(i);
                    dup.setStatus(StockReservation.ReservationStatus.CANCELLED);
                    dup.setReleasedAt(LocalDateTime.now());
                    reservationRepository.save(dup);
                    duplicatesRemoved++;
                    log.warn("REPAIR: cancelled duplicate product reservation id={} orderId={} productId={} qty={}",
                            dup.getId(), dup.getOrderId(), dup.getProductId(), dup.getQuantity());
                }
            }
        }

        // ── 2. Recalculate reservedQuantity for every material stock ──────────
        for (MaterialStock ms : materialStockRepository.findAll()) {
            int trulyReserved = recalculateReservedQuantityMaterial(ms.getId());
            int stored = ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            if (stored != trulyReserved) {
                log.warn("REPAIR MATERIAL: id={} name={} storedReserved={} → correctedReserved={}",
                        ms.getId(), ms.getName(), stored, trulyReserved);
                ms.setReservedQuantity(trulyReserved);
                materialStockRepository.save(ms);
                materialStocksFixed++;
            }
        }

        // ── 3. Recalculate reservedQuantity for every product stock ───────────
        for (ProductStock ps : productStockRepository.findAll()) {
            int trulyReserved = recalculateReservedQuantityProduct(ps.getProductId());
            int stored = ps.getReservedQuantity() != null ? ps.getReservedQuantity() : 0;
            if (stored != trulyReserved) {
                log.warn("REPAIR PRODUCT: id={} name={} storedReserved={} → correctedReserved={}",
                        ps.getId(), ps.getProductName(), stored, trulyReserved);
                ps.setReservedQuantity(trulyReserved);
                productStockRepository.save(ps);
                productStocksFixed++;
            }
        }

        log.info("REPAIR COMPLETE — materialStocksFixed={}, productStocksFixed={}, duplicatesRemoved={}",
                materialStocksFixed, productStocksFixed, duplicatesRemoved);

        return new RepairResult(materialStocksFixed, productStocksFixed, duplicatesRemoved);
    }

    public record RepairResult(int materialStocksFixed, int productStocksFixed, int duplicatesRemoved) {}

    // ─── Scheduled expiry ─────────────────────────────────────────────────────

    @Scheduled(fixedRate = 60_000)
    public void expireStaleReservations() {
        List<StockReservation> expired = reservationRepository
                .findByStatusAndExpiresAtBefore(StockReservation.ReservationStatus.ACTIVE, LocalDateTime.now());
        if (!expired.isEmpty()) {
            log.info("EXPIRE: found {} stale reservations", expired.size());
        }
        for (StockReservation res : expired) {
            log.warn("EXPIRE: releasing reservation id={} orderId={} type={} qty={}",
                    res.getId(), res.getOrderId(), res.getType(), res.getQuantity());
            markReleasedAndSync(res, StockReservation.ReservationStatus.EXPIRED);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private void markReleasedAndSync(StockReservation res, StockReservation.ReservationStatus newStatus) {
        if (res.getStatus() != StockReservation.ReservationStatus.ACTIVE) {
            log.debug("SKIP release: reservation {} already in status {}", res.getId(), res.getStatus());
            return;
        }
        res.setStatus(newStatus);
        res.setReleasedAt(LocalDateTime.now());
        reservationRepository.save(res);

        if (res.getType() == StockReservation.ReservationType.FINISHED_PRODUCT && res.getProductId() != null) {
            productStockRepository.findByProductId(res.getProductId()).stream().findFirst()
                    .ifPresent(stock -> syncProductReservedQuantity(res.getProductId(), stock));
        } else if (res.getType() == StockReservation.ReservationType.RAW_MATERIAL && res.getMaterialId() != null) {
            materialStockRepository.findById(res.getMaterialId())
                    .ifPresent(stock -> syncMaterialReservedQuantity(res.getMaterialId(), stock));
        }
    }

    /**
     * Recalculates the true reservedQuantity from ACTIVE StockReservations
     * and persists it on the stock document.
     */
    private void syncProductReservedQuantity(String productId, ProductStock stock) {
        int trulyReserved = recalculateReservedQuantityProduct(productId);
        stock.setReservedQuantity(trulyReserved);
        productStockRepository.save(stock);
        log.debug("SYNC PRODUCT reserved — productId={}, name={}, reserved={}",
                productId, stock.getProductName(), trulyReserved);
    }

    private void syncMaterialReservedQuantity(String materialId, MaterialStock stock) {
        int trulyReserved = recalculateReservedQuantityMaterial(materialId);
        stock.setReservedQuantity(trulyReserved);
        materialStockRepository.save(stock);
        log.debug("SYNC MATERIAL reserved — materialId={}, name={}, reserved={}",
                materialId, stock.getName(), trulyReserved);
    }
}
