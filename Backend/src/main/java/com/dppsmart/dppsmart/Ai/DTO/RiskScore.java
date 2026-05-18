package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RiskScore {
    private int overall;
    private int supplyChain;
    private int production;
    private int stock;
    private int marketDemand;
}