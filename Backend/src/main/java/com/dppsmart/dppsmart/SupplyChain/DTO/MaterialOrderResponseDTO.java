package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MaterialOrderResponseDTO {
    private String id;
    private String orderNumber;
    private String supplierId;
    private String supplierName;
    private String organizationId;
    private String orderedBy;
    private String status;
    private LocalDate expectedDeliveryDate;
    private LocalDateTime shippedAt;
    private LocalDateTime receivedAt;
    private String notes;
    private Integer totalOrderedQuantity;
    private Integer totalReceivedQuantity;
    private Integer totalAcceptedQuantity;
    private Integer totalRejectedQuantity;
    private Integer totalReturnedQuantity;
    private Integer totalAmount;
    private List<MaterialOrderItemDTO> items;
    private List<String> deliveryIds;
    private List<String> returnRequestIds;
    private List<String> disputeIds;
    private List<String> discussionIds;
    private String shipmentTrackingNumber;
    private String shipmentCarrier;
    private String invoiceNumber;
    private String invoiceUrl;
    private List<String> deliveryProofPhotos;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class MaterialOrderItemDTO {
        private String id;
        private String materialId;
        private String materialName;
        private String materialReference;
        private Integer orderedQuantity;
        private Integer receivedQuantity;
        private Integer acceptedQuantity;
        private Integer rejectedQuantity;
        private Integer returnedQuantity;
        private Integer unitPrice;
        private String unit;
        private String conditionStatus;
        private String notes;
        private Integer remainingQuantity;
    }
}