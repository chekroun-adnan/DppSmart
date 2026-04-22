package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ProductAiScoreDto {
    private Integer score;
    private List<String> missingFields;
    private String summary;
}

