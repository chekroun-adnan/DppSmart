package com.dppsmart.dppsmart.Workforce.Services;

import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Workforce.DTO.EmployeeWorkloadDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeWorkloadService {

    private final ProductionRepository productionRepository;
    private final EmployeesRepository employeesRepository;

    public EmployeeWorkloadDto getWorkload(String employeeId) {
        Employees employee = employeesRepository.findById(employeeId).orElse(null);
        String name = employee != null ? employee.getFullName() : employeeId;
        String dept = employee != null ? employee.getDepartmentName() : null;

        List<Production> activeProductions = productionRepository.findAll().stream()
                .filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS || p.getStatus() == ProductionStatus.PLANNED)
                .collect(Collectors.toList());

        List<String> assignedProductionIds = new ArrayList<>();
        int operationsCount = 0;
        double remainingHours = 0;

        for (Production prod : activeProductions) {
            if (prod.getSteps() == null) continue;
            for (var step : prod.getSteps()) {
                String op = step.getOperator();
                if (op != null && (op.equals(employeeId) || op.equals(name))) {
                    if (!step.getCompleted()) {
                        operationsCount++;
                        if (step.getTotalDuration() != null) remainingHours += step.getTotalDuration() / 60.0;
                    }
                    if (!assignedProductionIds.contains(prod.getId())) assignedProductionIds.add(prod.getId());
                }
            }
        }

        String level;
        String message = null;
        if (operationsCount == 0)      { level = "LOW"; }
        else if (operationsCount <= 2) { level = "NORMAL"; }
        else if (operationsCount <= 4) { level = "HIGH"; }
        else { level = "OVERLOADED"; message = "Employee workload exceeds capacity."; }

        EmployeeWorkloadDto dto = new EmployeeWorkloadDto();
        dto.setEmployeeId(employeeId);
        dto.setEmployeeName(name);
        dto.setDepartmentName(dept);
        dto.setActiveAssignments(operationsCount);
        dto.setEstimatedRemainingHours(Math.round(remainingHours * 10.0) / 10.0);
        dto.setOrdersAssigned(assignedProductionIds.size());
        dto.setOperationsAssigned(operationsCount);
        dto.setWarningLevel(level);
        dto.setWarningMessage(message);
        dto.setAssignedProductionIds(assignedProductionIds);
        return dto;
    }
}
