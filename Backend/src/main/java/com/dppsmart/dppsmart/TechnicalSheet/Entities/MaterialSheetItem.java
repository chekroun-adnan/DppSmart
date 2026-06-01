package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ts_material_items")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MaterialSheetItem {
    @Id
    private String id;
    private String technicalSheetId;
    private String materialId;
    private String materialName;
    private String referenceCode;
    private Double quantityPerUnit;
    private String unit;
    private Double wastePercentage;
    private String notes;

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }
}
