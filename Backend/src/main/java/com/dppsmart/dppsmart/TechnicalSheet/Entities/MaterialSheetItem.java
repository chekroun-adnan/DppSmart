package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ts_material_items")
@Data
public class MaterialSheetItem {
    @Id
    private String id;
    private String technicalSheetId;
    private String materialId;
    private Double quantity;
    private String unit;
    private String notes;
}
