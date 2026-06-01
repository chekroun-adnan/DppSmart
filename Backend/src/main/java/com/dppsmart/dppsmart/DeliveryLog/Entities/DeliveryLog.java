package com.dppsmart.dppsmart.DeliveryLog.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "delivery_logs")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DeliveryLog {
    @Id
    private String id;
    private String orderId;
    private String organizationId;
    private String createdBy;
    private DeliveryType type;
    private List<DeliveryItem> items;
    private DeliveryStatus status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DeliveryItem {
        private String productId;
        private String productName;
        private int quantity;
        private String unit;
    }

    public enum DeliveryType {
        FULL,
        PARTIAL
    }

    public enum DeliveryStatus {
        SCHEDULED,
        IN_TRANSIT,
        DELIVERED,
        CANCELLED
    }
}
