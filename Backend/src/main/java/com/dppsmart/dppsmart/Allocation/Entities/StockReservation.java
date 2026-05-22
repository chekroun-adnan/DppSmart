package com.dppsmart.dppsmart.Allocation.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "stock_reservations")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StockReservation {
    @Id
    private String id;

    @Indexed
    private String orderId;

    /** Identifies the specific order item — used for idempotency checks */
    private String orderItemId;

    private String organizationId;
    private String createdBy;
    private ReservationType type;

    @Indexed
    private String productId;

    @Indexed
    private String materialId;

    private int quantity;
    private ReservationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime releasedAt;
    private LocalDateTime consumedAt;

    public enum ReservationType {
        FINISHED_PRODUCT,
        RAW_MATERIAL
    }

    public enum ReservationStatus {
        ACTIVE,
        CONSUMED,
        RELEASED,
        EXPIRED,
        CANCELLED
    }
}
