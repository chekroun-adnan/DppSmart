package com.dppsmart.dppsmart.Dashboard.DTO;

import com.dppsmart.dppsmart.User.Entities.Roles;
import lombok.Data;

import java.util.List;

@Data
public class DashboardResponseDto {
    private Roles role;
    private String userEmail;
    private List<String> organizationScopeIds;
    private DashboardKpisDto kpis;
}

