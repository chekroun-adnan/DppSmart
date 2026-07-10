package com.dppsmart.dppsmart.Task.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmployeeWorkloadDto {
    private String employeeId;
    private String employeeName;
    private long assignedTasks;
    private long activeTasks;
    private long completedToday;
    private double efficiencyPercent;
    private long capacity;
    private double utilizationPercent;
    private String departmentName;
}
