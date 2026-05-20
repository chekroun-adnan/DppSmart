package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;
import java.util.List;

@Data
public class SupplyChainOrderRequestDTO {
    private String supplierId;
    private String organizationId;
    private String expectedDeliveryDate;
    private String notes;
    private String linkedOrderId;
    private String linkedOrderReference;
    private List<MaterialLineDTO> items;

    @Data
    public static class MaterialLineDTO {
        private String materialId;
        private String materialName;
        private String materialReference;
        private Integer orderedQuantity;
        private String unit;
        private String notes;
    }
}
