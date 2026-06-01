package com.dppsmart.dppsmart.SecurityAlert.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecurityAlertStatsDto {
    private long totalOpen;
    private long totalCritical;
    private long totalHigh;
    private long totalMedium;
    private long totalLow;
    private long authAlerts;
    private long stockAlerts;
    private long supplierAlerts;
    private long orderAlerts;
    private long qrScanAlerts;
    private long productionAlerts;
}
