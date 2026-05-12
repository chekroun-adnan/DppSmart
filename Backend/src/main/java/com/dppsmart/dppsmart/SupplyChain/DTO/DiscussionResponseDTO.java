package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class DiscussionResponseDTO {
    private String id;
    private String materialOrderId;
    private String organizationId;
    private List<DiscussionMessageDTO> messages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class DiscussionMessageDTO {
        private String id;
        private String sender;
        private String senderRole;
        private String senderName;
        private String message;
        private LocalDateTime timestamp;
    }
}