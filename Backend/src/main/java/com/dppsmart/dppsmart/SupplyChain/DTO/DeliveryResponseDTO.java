package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class DeliveryResponseDTO {
    private String id;
    private String materialOrderId;
    private String organizationId;
    private String status;
    private Integer totalQuantity;
    private List<DeliveryItemResponseDTO> items;
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
    public static class DeliveryItemResponseDTO {
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