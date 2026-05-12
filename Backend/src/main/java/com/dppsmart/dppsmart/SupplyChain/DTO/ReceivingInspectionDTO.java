package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class ReceivingInspectionDTO {
    private String deliveryId;
    private String materialOrderId;
    private List<ItemInspectionDTO> items;
    private String notes;

    @Data
    public static class ItemInspectionDTO {
        private String itemId;
        private String materialId;
        private Integer receivedQuantity;
        private Integer acceptedQuantity;
        private Integer rejectedQuantity;
        private String conditionStatus;
        private String notes;
    }
}