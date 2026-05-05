package com.dppsmart.dppsmart.Product.Entities;

import lombok.Data;

@Data
public class RawMaterial {
    private String name;
    private String reference;
    private String supplier;
    private String unit;
    private Double quantity;
    private String notes;
}
