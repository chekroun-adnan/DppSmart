package com.dppsmart.dppsmart.Workforce.Services;

import com.dppsmart.dppsmart.Attendance.Entities.AttendanceStatus;
import com.dppsmart.dppsmart.Attendance.Repositories.AttendanceRepository;
import com.dppsmart.dppsmart.Department.Entities.Department;
import com.dppsmart.dppsmart.Department.Repositories.DepartmentRepository;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Leave.Entities.LeaveStatus;
import com.dppsmart.dppsmart.Leave.Repositories.LeaveRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Workforce.DTO.WorkforcePlanDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkforcePlanningService {

    private final EmployeesRepository employeesRepository;
    private final DepartmentRepository departmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRepository leaveRepository;
    private final ProductionRepository productionRepository;
    private final EmployeeWorkloadService workloadService;

    public WorkforcePlanDto getPlan(String organizationId) {
        List<Employees> employees = employeesRepository.findByOrganizationId(organizationId);
        List<Department> departments = departmentRepository.findByOrganizationId(organizationId);

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59);

        List<String> onLeaveIds = leaveRepository.findByOrganizationIdAndStatus(organizationId, LeaveStatus.APPROVED)
                .stream()
                .filter(l -> !l.getStartDate().isAfter(today) && !l.getEndDate().isBefore(today))
                .map(l -> l.getEmployeeId())
                .collect(Collectors.toList());

        long presentCount = attendanceRepository.countByOrganizationIdAndStatusAndCheckInBetween(
                organizationId, AttendanceStatus.PRESENT, startOfDay, endOfDay)
                + attendanceRepository.countByOrganizationIdAndStatusAndCheckInBetween(
                organizationId, AttendanceStatus.COMPLETED, startOfDay, endOfDay);

        long overloadedCount = employees.stream()
                .filter(e -> "OVERLOADED".equals(workloadService.getWorkload(e.getId()).getWarningLevel()))
                .count();

        List<Production> activeProductions = productionRepository.findByOrganizationId(organizationId)
                .stream().filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS || p.getStatus() == ProductionStatus.PLANNED)
                .collect(Collectors.toList());

        List<WorkforcePlanDto.DepartmentCapacityDto> deptCapacities = new ArrayList<>();
        for (Department dept : departments) {
            List<Employees> deptEmployees = employees.stream()
                    .filter(e -> dept.getId().equals(e.getDepartmentId()))
                    .collect(Collectors.toList());

            long deptOnLeave = deptEmployees.stream().filter(e -> onLeaveIds.contains(e.getId())).count();
            long deptOverloaded = deptEmployees.stream()
                    .filter(e -> "OVERLOADED".equals(workloadService.getWorkload(e.getId()).getWarningLevel()))
                    .count();
            int available = (int) (deptEmployees.size() - deptOnLeave);

            long deptProductions = activeProductions.stream()
                    .flatMap(p -> (p.getSteps() == null ? List.<com.dppsmart.dppsmart.Production.Entities.ProductionStep>of() : p.getSteps()).stream())
                    .filter(s -> dept.getName().equalsIgnoreCase(s.getOperator()) ||
                            deptEmployees.stream().anyMatch(e -> e.getFullName().equals(s.getOperator())))
                    .map(s -> s.getStepName()).distinct().count();

            String status;
            if (available == 0)                     status = "CRITICAL";
            else if (deptOverloaded > 0)            status = "WARNING";
            else                                    status = "OK";

            deptCapacities.add(new WorkforcePlanDto.DepartmentCapacityDto(
                    dept.getId(), dept.getName(), deptEmployees.size(), available,
                    (int) deptOnLeave, (int) deptOverloaded, (int) deptProductions, status));
        }

        WorkforcePlanDto plan = new WorkforcePlanDto();
        plan.setOrganizationId(organizationId);
        plan.setTotalEmployees(employees.size());
        plan.setPresentToday((int) presentCount);
        plan.setOnLeave(onLeaveIds.size());
        plan.setOverloaded((int) overloadedCount);
        plan.setDepartmentCapacities(deptCapacities);
        return plan;
    }
}
