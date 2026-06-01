package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReceptionResponseDTO {
    private String id;
    private String materialOrderId;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private String decision;
    private String notes;
    private String rejectionReason;
    private List<StockReceivingResultDTO> stockResults;
}