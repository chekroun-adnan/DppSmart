package com.dppsmart.dppsmart.Allocation.Repositories;

import com.dppsmart.dppsmart.Allocation.Entities.StockReservation;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface StockReservationRepository extends MongoRepository<StockReservation, String> {

    List<StockReservation> findByOrderId(String orderId);
    List<StockReservation> findByOrderIdAndStatus(String orderId, StockReservation.ReservationStatus status);
    List<StockReservation> findByStatusAndExpiresAtBefore(StockReservation.ReservationStatus status, LocalDateTime now);
    List<StockReservation> findByProductIdAndStatus(String productId, StockReservation.ReservationStatus status);
    List<StockReservation> findByMaterialIdAndStatus(String materialId, StockReservation.ReservationStatus status);
    List<StockReservation> findByOrganizationIdAndStatus(String organizationId, StockReservation.ReservationStatus status);

    // Idempotency: check if a reservation already exists for a specific order + material/product
    boolean existsByOrderIdAndMaterialIdAndStatus(String orderId, String materialId, StockReservation.ReservationStatus status);
    boolean existsByOrderIdAndProductIdAndStatus(String orderId, String productId, StockReservation.ReservationStatus status);

    // Idempotency by orderItemId (more granular)
    boolean existsByOrderItemIdAndStatus(String orderItemId, StockReservation.ReservationStatus status);
    List<StockReservation> findByOrderItemIdAndStatus(String orderItemId, StockReservation.ReservationStatus status);

    // Sum of active reserved quantities for a given stock — used for recalculation
    @Aggregation(pipeline = {
        "{ $match: { materialId: ?0, status: 'ACTIVE' } }",
        "{ $group: { _id: null, total: { $sum: '$quantity' } } }"
    })
    SumResult sumQuantityByMaterialIdAndStatusActive(String materialId);

    @Aggregation(pipeline = {
        "{ $match: { productId: ?0, status: 'ACTIVE' } }",
        "{ $group: { _id: null, total: { $sum: '$quantity' } } }"
    })
    SumResult sumQuantityByProductIdAndStatusActive(String productId);

    // Duplicate detection: all ACTIVE reservations for same orderId + materialId (should be at most 1)
    List<StockReservation> findByOrderIdAndMaterialIdAndStatus(String orderId, String materialId, StockReservation.ReservationStatus status);
    List<StockReservation> findByOrderIdAndProductIdAndStatus(String orderId, String productId, StockReservation.ReservationStatus status);

    int countByProductIdAndStatus(String productId, StockReservation.ReservationStatus status);
    int countByMaterialIdAndStatus(String materialId, StockReservation.ReservationStatus status);

    /** Projection used by aggregation pipeline sum queries */
    interface SumResult {
        Integer getTotal();
    }
}
