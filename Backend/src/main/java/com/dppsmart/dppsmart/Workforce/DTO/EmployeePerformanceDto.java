package com.dppsmart.dppsmart.Workforce.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmployeePerformanceDto {
    private String employeeId;
    private String employeeName;
    private String departmentName;
    private int operationsCompleted;
    private int operationsAssigned;
    private int ordersWorkedOn;
    private double avgEstimatedDurationHours;
    private double avgActualDurationHours;
    private double productivityScore;      // 0-100
    private double attendanceScore;        // 0-100
    private double overallScore;           // 0-100
    private String performanceLevel;       // POOR, AVERAGE, GOOD, EXCELLENT
}
