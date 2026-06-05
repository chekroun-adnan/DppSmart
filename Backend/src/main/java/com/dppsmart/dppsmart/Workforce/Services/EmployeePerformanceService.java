package com.dppsmart.dppsmart.Workforce.Services;

import com.dppsmart.dppsmart.Attendance.Entities.AttendanceStatus;
import com.dppsmart.dppsmart.Attendance.Repositories.AttendanceRepository;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Leave.Entities.LeaveStatus;
import com.dppsmart.dppsmart.Leave.Repositories.LeaveRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Workforce.DTO.EmployeePerformanceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeePerformanceService {

    private final ProductionRepository productionRepository;
    private final EmployeesRepository employeesRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRepository leaveRepository;

    public EmployeePerformanceDto getPerformance(String employeeId) {
        Employees employee = employeesRepository.findById(employeeId).orElse(null);
        String name = employee != null ? employee.getFullName() : employeeId;
        String dept = employee != null ? employee.getDepartmentName() : null;

        List<Production> allProductions = productionRepository.findAll();

        int totalAssigned = 0, totalCompleted = 0;
        double totalEstimated = 0, totalActual = 0;
        Set<String> orderIds = new HashSet<>();

        for (Production prod : allProductions) {
            if (prod.getSteps() == null) continue;
            boolean workedOn = false;
            for (var step : prod.getSteps()) {
                String op = step.getOperator();
                if (op == null || (!op.equals(employeeId) && !op.equals(name))) continue;
                totalAssigned++;
                workedOn = true;
                if (Boolean.TRUE.equals(step.getCompleted())) {
                    totalCompleted++;
                    if (step.getTotalDuration() != null) totalEstimated += step.getTotalDuration();
                    if (step.getEndDate() != null && step.getStartDate() != null) {
                        double actualMin = java.time.temporal.ChronoUnit.MINUTES.between(step.getStartDate(), step.getEndDate());
                        totalActual += actualMin;
                    }
                }
            }
            if (workedOn && prod.getClientOrderId() != null) orderIds.add(prod.getClientOrderId());
        }

        double productivity = totalAssigned > 0 ? Math.min(100, (double) totalCompleted / totalAssigned * 100) : 0;

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long presentDays = attendanceRepository.countByOrganizationIdAndStatusAndCheckInBetween(
                employee != null ? employee.getOrganizationId() : "", AttendanceStatus.COMPLETED, thirtyDaysAgo, LocalDateTime.now());
        double attendanceScore = Math.min(100, presentDays / 22.0 * 100);

        double overall = (productivity * 0.6) + (attendanceScore * 0.4);
        String level;
        if (overall >= 85)      level = "EXCELLENT";
        else if (overall >= 65) level = "GOOD";
        else if (overall >= 40) level = "AVERAGE";
        else                    level = "POOR";

        EmployeePerformanceDto dto = new EmployeePerformanceDto();
        dto.setEmployeeId(employeeId);
        dto.setEmployeeName(name);
        dto.setDepartmentName(dept);
        dto.setOperationsCompleted(totalCompleted);
        dto.setOperationsAssigned(totalAssigned);
        dto.setOrdersWorkedOn(orderIds.size());
        dto.setAvgEstimatedDurationHours(totalCompleted > 0 ? Math.round(totalEstimated / totalCompleted / 60.0 * 10) / 10.0 : 0);
        dto.setAvgActualDurationHours(totalCompleted > 0 ? Math.round(totalActual / totalCompleted / 60.0 * 10) / 10.0 : 0);
        dto.setProductivityScore(Math.round(productivity * 10) / 10.0);
        dto.setAttendanceScore(Math.round(attendanceScore * 10) / 10.0);
        dto.setOverallScore(Math.round(overall * 10) / 10.0);
        dto.setPerformanceLevel(level);
        return dto;
    }
}
