package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.ReturnRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "return_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequest {
    @Id
    private String id;
    private String returnId;
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private String materialName;
    private String organizationId;
    private Integer quantity;
    private String reason;
    private ReturnRequestStatus status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private String approvedBy;
    private String supplierResponse;
    private String notes;
    private String returnTrackingNumber;
    private String carrier;
}