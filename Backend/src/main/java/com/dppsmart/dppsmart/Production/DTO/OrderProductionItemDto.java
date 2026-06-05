package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

@Data
public class OrderProductionItemDto {
    private String productId;
    private String productName;
    private int quantity;
    private String technicalSheetFound;
}
