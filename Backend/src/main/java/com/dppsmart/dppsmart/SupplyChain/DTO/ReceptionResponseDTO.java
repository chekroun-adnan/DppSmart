package com.dppsmart.dppsmart.SupplyChain.DTO;

import com.dppsmart.dppsmart.SupplyChain.Enums.ReceptionDecision;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReceptionResponseDTO {
    private String id;
    private String materialOrderId;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private ReceptionDecision decision;
    private String notes;
    private String rejectionReason;
}
