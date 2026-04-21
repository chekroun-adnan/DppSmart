package com.dppsmart.dppsmart.Stock.DTO;

import lombok.Data;

@Data
public class UpdatedStockDTO {

    private String materialName;
    private Integer quantity;
    private Integer minimumThreshold;
    private String unit;
    private String organizationId;
    private String id;
}
