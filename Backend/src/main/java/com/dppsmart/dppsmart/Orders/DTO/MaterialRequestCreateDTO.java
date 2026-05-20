package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;
import java.util.List;

@Data
public class MaterialRequestCreateDTO {
    private List<MaterialRequestItem> items;
    private String note;

    @Data
    public static class MaterialRequestItem {
        private String materialId;
        private String materialName;
        private String unit;
        private Double requestedQuantity;
    }
}
