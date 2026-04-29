package com.dppsmart.dppsmart.Dashboard.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.Data;

import java.util.List;

@Data
public class DashboardResponseDto {
    private Roles role;
    private String userEmail;
    private List<String> organizationScopeIds;
    private List<OrganizationScopeDto> organizationScopes;
    private DashboardKpisDto kpis;
    private Integer dppComplianceScore;
    private BottleneckDto bottleneck;
    private List<RiskProductDto> topRiskProducts;
    private List<ActivityItemDto> liveActivity;
    private List<PriorityItemDto> todayPriorities;
    private List<ExportMarketItemDto> exportMarketSnapshot;
    private List<NotificationItemDto> notifications;
}

