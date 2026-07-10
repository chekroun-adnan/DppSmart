package com.dppsmart.dppsmart.Billing.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoxTypeSummary {
    private String boxType;
    private Integer capacity;
    private Integer quantity;
}
