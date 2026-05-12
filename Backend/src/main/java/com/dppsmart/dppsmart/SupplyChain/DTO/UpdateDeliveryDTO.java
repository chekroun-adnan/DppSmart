package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class UpdateDeliveryDTO {
    private String status;
    private String trackingNumber;
    private String carrier;
    private String notes;
    private List<String> photos;

    @Data
    public static class DeliveryItemUpdateDTO {
        private String itemId;
        private Integer acceptedQuantity;
        private Integer rejectedQuantity;
        private String conditionStatus;
        private String notes;
    }
    private List<DeliveryItemUpdateDTO> itemDecisions;
}