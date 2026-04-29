package com.dppsmart.dppsmart.Dashboard.DTO;

import lombok.Data;

import java.util.List;

@Data
public class RiskProductDto {
    private String productId;
    private String productName;
    private Long riskScore;
    private List<String> reasons;
}
