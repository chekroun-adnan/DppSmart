package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.DeliveryStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "material_deliveries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Delivery {
    @Id
    private String id;
    private String materialOrderId;
    private String organizationId;
    private DeliveryStatus status;
    private Integer totalQuantity;
    private List<DeliveryItem> items;
    private String trackingNumber;
    private String carrier;
    private String notes;
    private List<String> photos;
    private String shippedBy;
    private LocalDateTime shippedAt;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryItem {
        private String itemId;
        private String materialId;
        private String materialName;
        private Integer quantity;
        private Integer acceptedQuantity;
        private Integer rejectedQuantity;
        private String conditionStatus;
        private String notes;
    }
}