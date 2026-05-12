package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.util.List;

@Data
public class UpdateMaterialOrderDTO {
    private String status;
    private String expectedDeliveryDate;
    private String notes;
    private String shipmentTrackingNumber;
    private String shipmentCarrier;
    private String invoiceNumber;
    private String invoiceUrl;
    private List<String> deliveryProofPhotos;
}