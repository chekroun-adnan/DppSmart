package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class CreateReceptionDTO {
    private String materialOrderId;
    @NotBlank(message = "decision is required")
    private String decision;
    private String notes;
    private String rejectionReason;
    private List<ItemReceptionDTO> itemDecisions;

    @Data
    public static class ItemReceptionDTO {
        @NotBlank(message = "itemId is required")
        private String itemId;
        private Integer approvedQuantity;
        private Integer rejectedQuantity;
        private String conditionStatus;
        private String notes;
    }
}
