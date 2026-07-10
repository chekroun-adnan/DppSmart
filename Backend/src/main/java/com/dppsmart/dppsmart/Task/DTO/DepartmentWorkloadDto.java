package com.dppsmart.dppsmart.Task.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DepartmentWorkloadDto {
    private String departmentId;
    private String departmentName;
    private long activeTasks;
    private long totalTasks;
    private int capacity;
    private double utilizationPercent;
}
