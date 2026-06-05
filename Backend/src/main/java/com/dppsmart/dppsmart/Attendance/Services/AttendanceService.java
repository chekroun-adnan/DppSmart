package com.dppsmart.dppsmart.Attendance.Services;

import com.dppsmart.dppsmart.Attendance.DTO.AttendanceResponseDto;
import com.dppsmart.dppsmart.Attendance.DTO.CheckInDto;
import com.dppsmart.dppsmart.Attendance.Entities.Attendance;
import com.dppsmart.dppsmart.Attendance.Entities.AttendanceStatus;
import com.dppsmart.dppsmart.Attendance.Repositories.AttendanceRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeesRepository employeesRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public AttendanceResponseDto checkIn(CheckInDto dto) {
        User user = currentUser();
        Employees employee = employeesRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new NotFoundException("Employee not found"));

        String orgId = dto.getOrganizationId() != null ? dto.getOrganizationId() : employee.getOrganizationId();
        if (!permissionService.canAccessOrganization(user, orgId) && !user.getId().equals(dto.getEmployeeId()))
            throw new ForbiddenException("Access denied");

        attendanceRepository.findByEmployeeIdAndStatus(dto.getEmployeeId(), AttendanceStatus.PRESENT)
                .ifPresent(a -> { throw new BadRequestException("Employee is already checked in"); });

        Attendance attendance = new Attendance();
        attendance.setEmployeeId(dto.getEmployeeId());
        attendance.setEmployeeName(employee.getFullName());
        attendance.setOrganizationId(orgId);
        attendance.setCheckIn(LocalDateTime.now());
        attendance.setStatus(AttendanceStatus.PRESENT);
        attendance.setNotes(dto.getNotes());
        attendance.setCreatedAt(LocalDateTime.now());
        attendance.setUpdatedAt(LocalDateTime.now());

        Attendance saved = attendanceRepository.save(attendance);
        auditService.log("Attendance", saved.getId(), "CHECK_IN", orgId, null, "Employee checked in: " + employee.getFullName());
        return toDto(saved);
    }

    public AttendanceResponseDto checkOut(String employeeId) {
        User user = currentUser();
        Attendance attendance = attendanceRepository.findByEmployeeIdAndStatus(employeeId, AttendanceStatus.PRESENT)
                .orElseThrow(() -> new NotFoundException("No active check-in found for this employee"));

        if (!permissionService.canAccessOrganization(user, attendance.getOrganizationId()) && !user.getId().equals(employeeId))
            throw new ForbiddenException("Access denied");

        LocalDateTime checkOut = LocalDateTime.now();
        attendance.setCheckOut(checkOut);
        attendance.setStatus(AttendanceStatus.COMPLETED);

        double workMinutes = ChronoUnit.MINUTES.between(attendance.getCheckIn(), checkOut);
        double breakMinutes = attendance.getBreakDurationMinutes() != null ? attendance.getBreakDurationMinutes() : 0;
        attendance.setWorkDurationMinutes(workMinutes - breakMinutes);
        double standard = 8 * 60;
        if (workMinutes > standard) attendance.setOvertimeDurationMinutes(workMinutes - standard);
        attendance.setUpdatedAt(LocalDateTime.now());

        Attendance saved = attendanceRepository.save(attendance);
        auditService.log("Attendance", saved.getId(), "CHECK_OUT", saved.getOrganizationId(), null, "Employee checked out: " + saved.getEmployeeName());
        return toDto(saved);
    }

    public List<AttendanceResponseDto> getByEmployee(String employeeId) {
        User user = currentUser();
        if (!user.getId().equals(employeeId) && user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
        return attendanceRepository.findByEmployeeId(employeeId).stream().map(this::toDto).toList();
    }

    public List<AttendanceResponseDto> getByOrganization(String organizationId) {
        User user = currentUser();
        if (!permissionService.canAccessOrganization(user, organizationId))
            throw new ForbiddenException("Access denied");
        return attendanceRepository.findByOrganizationId(organizationId).stream().map(this::toDto).toList();
    }

    public List<AttendanceResponseDto> getAll() {
        User user = currentUser();
        return attendanceRepository.findAll().stream()
                .filter(a -> permissionService.canAccessOrganization(user, a.getOrganizationId()))
                .map(this::toDto).toList();
    }

    private AttendanceResponseDto toDto(Attendance a) {
        AttendanceResponseDto dto = new AttendanceResponseDto();
        dto.setId(a.getId());
        dto.setEmployeeId(a.getEmployeeId());
        dto.setEmployeeName(a.getEmployeeName());
        dto.setOrganizationId(a.getOrganizationId());
        dto.setCheckIn(a.getCheckIn());
        dto.setCheckOut(a.getCheckOut());
        dto.setBreakDurationMinutes(a.getBreakDurationMinutes());
        dto.setOvertimeDurationMinutes(a.getOvertimeDurationMinutes());
        dto.setWorkDurationMinutes(a.getWorkDurationMinutes());
        dto.setStatus(a.getStatus());
        dto.setNotes(a.getNotes());
        dto.setCreatedAt(a.getCreatedAt());
        return dto;
    }

    public List<AttendanceResponseDto> getMyAttendance() {
        User user = currentUser();
        return attendanceRepository.findByEmployeeId(user.getId()).stream().map(this::toDto).toList();
    }

    public AttendanceResponseDto checkOutSelf() {
        User user = currentUser();
        return checkOut(user.getId());
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow(() -> new NotFoundException("User not found"));
    }
}
