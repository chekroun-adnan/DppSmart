package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class CreateDeliveryDTO {
    private String materialOrderId;
    private List<DeliveryItemDTO> items;
    private String trackingNumber;
    private String carrier;
    private String notes;
    private List<String> photos;

    @Data
    public static class DeliveryItemDTO {
        private String itemId;
        private String materialId;
        private Integer quantity;
    }
}