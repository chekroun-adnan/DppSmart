package com.dppsmart.dppsmart.SupplyChain.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "supplier_discussions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierDiscussion {
    @Id
    private String id;
    private String materialOrderId;
    private String organizationId;
    private List<DiscussionMessage> messages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscussionMessage {
        private String id;
        private String sender;
        private String senderRole;
        private String senderName;
        private String message;
        private LocalDateTime timestamp;
    }
}