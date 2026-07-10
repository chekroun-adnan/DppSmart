package com.dppsmart.dppsmart.Task.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskDashboardDto {
    private long totalTasks;
    private long assignedToday;
    private long inProgress;
    private long completedToday;
    private long blockedTasks;
    private long overdueTasks;
    private long tasksDueToday;
    private double averageCompletionTime;
    private List<DepartmentWorkloadDto> departmentWorkload;
    private List<EmployeeWorkloadDto> employeeWorkload;
}
