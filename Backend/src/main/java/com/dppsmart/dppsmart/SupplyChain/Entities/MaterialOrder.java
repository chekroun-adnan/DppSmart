package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "material_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialOrder {
    @Id
    private String id;
    private String orderNumber;
    private String supplierId;
    private String organizationId;
    private String orderedBy;
    private MaterialOrderStatus status;
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
    private List<MaterialOrderItem> items;
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

    public List<MaterialOrderItem> getItems() {
        return items != null ? items : new ArrayList<>();
    }
    public List<String> getDeliveryIds() { return deliveryIds != null ? deliveryIds : new ArrayList<>(); }
    public List<String> getReturnRequestIds() { return returnRequestIds != null ? returnRequestIds : new ArrayList<>(); }
    public List<String> getDisputeIds() { return disputeIds != null ? disputeIds : new ArrayList<>(); }
    public List<String> getDiscussionIds() { return discussionIds != null ? discussionIds : new ArrayList<>(); }
}