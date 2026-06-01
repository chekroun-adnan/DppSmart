package com.dppsmart.dppsmart.Scan.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ScanAnalyticsDto {
    private long totalScans;
    private long scansToday;
    private long suspiciousScans;
    private long fakeProducts;
    private List<ScanEventResponseDto> recentScans;
    private List<ScanEventResponseDto> recentSuspicious;
}
