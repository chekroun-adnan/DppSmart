package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ForecastItem {
    private String label;
    private String value;
    private Double confidence;
    private String period;
}