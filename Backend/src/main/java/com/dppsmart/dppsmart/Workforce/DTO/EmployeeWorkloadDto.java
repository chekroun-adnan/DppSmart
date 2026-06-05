package com.dppsmart.dppsmart.Workforce.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmployeeWorkloadDto {
    private String employeeId;
    private String employeeName;
    private String departmentName;
    private int activeAssignments;
    private double estimatedRemainingHours;
    private int ordersAssigned;
    private int operationsAssigned;
    private String warningLevel;  // LOW, NORMAL, HIGH, OVERLOADED
    private String warningMessage;
    private List<String> assignedProductionIds;
}
