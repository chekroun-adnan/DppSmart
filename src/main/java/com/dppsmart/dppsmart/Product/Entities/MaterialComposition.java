package com.dppsmart.dppsmart.Product.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MaterialComposition {
    private String materialName;
    private Double percentage;
    private Boolean recycledContent;
    private Double recycledPercentage;
}
