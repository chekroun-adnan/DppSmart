package com.dppsmart.dppsmart.PurchaseRequest.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "purchase_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequest {

    @Id
    private String id;
    private String reference;
    private String orderId;
    private String orderReference;
    private String organizationId;
    private String clientId;
    private PurchaseRequestStatus status;
    private List<PurchaseRequestItem> items;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime fulfilledAt;
}
