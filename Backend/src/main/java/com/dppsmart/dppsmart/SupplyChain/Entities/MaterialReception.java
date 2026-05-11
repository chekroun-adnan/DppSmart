package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.ReceptionDecision;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "material_receptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialReception {
    @Id
    private String id;
    private String materialOrderId;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private ReceptionDecision decision;
    private String notes;
    private String rejectionReason;
}
