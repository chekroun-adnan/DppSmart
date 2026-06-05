package com.dppsmart.dppsmart.Workforce.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WorkforcePlanDto {
    private String organizationId;
    private int totalEmployees;
    private int presentToday;
    private int onLeave;
    private int overloaded;
    private List<DepartmentCapacityDto> departmentCapacities;
    private String aiRecommendation;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DepartmentCapacityDto {
        private String departmentId;
        private String departmentName;
        private int totalEmployees;
        private int availableEmployees;
        private int onLeaveCount;
        private int overloadedCount;
        private int activeProductions;
        private String status; // OK, WARNING, CRITICAL
    }
}
