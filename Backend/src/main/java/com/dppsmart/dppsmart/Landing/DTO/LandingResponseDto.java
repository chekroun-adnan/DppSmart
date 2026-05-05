package com.dppsmart.dppsmart.Landing.DTO;

import lombok.Data;

import java.util.List;

@Data
public class LandingResponseDto {
    private LandingStatsDto stats;
    private List<TopScannedProductDto> topScannedProducts;
}

