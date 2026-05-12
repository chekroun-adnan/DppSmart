package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReturnRequestResponseDTO {
    private String id;
    private String returnId;
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private String materialName;
    private String organizationId;
    private Integer quantity;
    private String reason;
    private String status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private String approvedBy;
    private String supplierResponse;
    private String notes;
    private String returnTrackingNumber;
    private String carrier;
}