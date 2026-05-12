package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class DisputeResponseDTO {
    private String id;
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private String materialName;
    private String organizationId;
    private String type;
    private String description;
    private String status;
    private String raisedBy;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private String resolution;
    private String supplierResponse;
    private List<DisputeMessageDTO> messages;

    @Data
    public static class DisputeMessageDTO {
        private String sender;
        private String senderRole;
        private String message;
        private LocalDateTime timestamp;
    }
}