package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReceptionResponseDTO {
    private String id;
    private String materialOrderId;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private String decision;
    private String notes;
    private String rejectionReason;
}