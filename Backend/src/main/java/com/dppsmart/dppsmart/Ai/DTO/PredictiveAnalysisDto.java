package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PredictiveAnalysisDto {
    private String summary;
    private List<String> keyInsights;
    private List<String> recommendations;
    private List<ForecastItem> forecasts;
    private List<AnomalyItem> anomalies;
    private RiskScore riskScore;
    private TrendData trendData;
    private RealDataDto realData;
    private String rawResponse;
}