package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TrendData {
    private List<TrendPoint> scansTrend;
    private List<TrendPoint> ordersTrend;
    private List<TrendPoint> productionTrend;
}