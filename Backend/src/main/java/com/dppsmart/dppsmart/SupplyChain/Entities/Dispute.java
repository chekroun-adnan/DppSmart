package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.DisputeStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "disputes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Dispute {
    @Id
    private String id;
    private String purchaseOrderId;
    private String purchaseOrderItemId;
    private String materialId;
    private String materialName;
    private String organizationId;
    private String type;
    private String description;
    private DisputeStatus status;
    private String raisedBy;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private String resolution;
    private List<DisputeMessage> messages;
    private String supplierResponse;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DisputeMessage {
        private String sender;
        private String senderRole;
        private String message;
        private LocalDateTime timestamp;
    }
}