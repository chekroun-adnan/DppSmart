package com.dppsmart.dppsmart.Leave.Services;

import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Leave.DTO.CreateLeaveRequestDto;
import com.dppsmart.dppsmart.Leave.DTO.LeaveResponseDto;
import com.dppsmart.dppsmart.Leave.Entities.LeaveRequest;
import com.dppsmart.dppsmart.Leave.Entities.LeaveStatus;
import com.dppsmart.dppsmart.Leave.Repositories.LeaveRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeesRepository employeesRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    public LeaveResponseDto create(CreateLeaveRequestDto dto) {
        User user = currentUser();
        Employees employee = employeesRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new NotFoundException("Employee not found"));
        String orgId = dto.getOrganizationId() != null ? dto.getOrganizationId() : employee.getOrganizationId();

        if (!user.getId().equals(dto.getEmployeeId()) && !permissionService.canAccessOrganization(user, orgId))
            throw new ForbiddenException("Access denied");

        LeaveRequest leave = new LeaveRequest();
        leave.setEmployeeId(dto.getEmployeeId());
        leave.setEmployeeName(employee.getFullName());
        leave.setOrganizationId(orgId);
        leave.setType(dto.getType());
        leave.setStartDate(dto.getStartDate());
        leave.setEndDate(dto.getEndDate());
        leave.setReason(dto.getReason());
        leave.setStatus(LeaveStatus.PENDING);
        leave.setCreatedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());

        LeaveRequest saved = leaveRepository.save(leave);
        auditService.log("Leave", saved.getId(), "CREATE", orgId, null, "Leave request submitted by " + employee.getFullName());

        notificationService.createNotification(user.getId(), "Leave Request Submitted",
                employee.getFullName() + " submitted a " + dto.getType() + " leave request",
                NotificationType.TASK, "/leaves");
        return toDto(saved);
    }

    public LeaveResponseDto approve(String id, String reason) {
        User user = currentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
        LeaveRequest leave = getLeave(id);
        checkOrgAccess(user, leave.getOrganizationId());
        leave.setStatus(LeaveStatus.APPROVED);
        leave.setApprovedBy(user.getEmail());
        leave.setApprovedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());
        LeaveRequest saved = leaveRepository.save(leave);
        auditService.log("Leave", id, "APPROVE", leave.getOrganizationId(), null, "Leave approved for " + leave.getEmployeeName());
        notificationService.createNotification(leave.getEmployeeId(), "Leave Approved",
                "Your " + leave.getType() + " leave has been approved", NotificationType.TASK, "/leaves");
        return toDto(saved);
    }

    public LeaveResponseDto reject(String id, String reason) {
        User user = currentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
        LeaveRequest leave = getLeave(id);
        checkOrgAccess(user, leave.getOrganizationId());
        leave.setStatus(LeaveStatus.REJECTED);
        leave.setRejectionReason(reason);
        leave.setApprovedBy(user.getEmail());
        leave.setApprovedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());
        LeaveRequest saved = leaveRepository.save(leave);
        auditService.log("Leave", id, "REJECT", leave.getOrganizationId(), null, "Leave rejected for " + leave.getEmployeeName());
        notificationService.createNotification(leave.getEmployeeId(), "Leave Rejected",
                "Your " + leave.getType() + " leave request was rejected", NotificationType.TASK, "/leaves");
        return toDto(saved);
    }

    public List<LeaveResponseDto> getAll() {
        User user = currentUser();
        return leaveRepository.findAll().stream()
                .filter(l -> permissionService.canAccessOrganization(user, l.getOrganizationId())
                        || user.getId().equals(l.getEmployeeId()))
                .map(this::toDto).toList();
    }

    public List<LeaveResponseDto> getByEmployee(String employeeId) {
        User user = currentUser();
        if (!user.getId().equals(employeeId) && user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
        return leaveRepository.findByEmployeeId(employeeId).stream().map(this::toDto).toList();
    }

    public List<LeaveResponseDto> getByOrganization(String organizationId) {
        User user = currentUser();
        checkOrgAccess(user, organizationId);
        return leaveRepository.findByOrganizationId(organizationId).stream().map(this::toDto).toList();
    }

    private LeaveRequest getLeave(String id) {
        return leaveRepository.findById(id).orElseThrow(() -> new NotFoundException("Leave request not found"));
    }

    private LeaveResponseDto toDto(LeaveRequest l) {
        LeaveResponseDto dto = new LeaveResponseDto();
        dto.setId(l.getId());
        dto.setEmployeeId(l.getEmployeeId());
        dto.setEmployeeName(l.getEmployeeName());
        dto.setOrganizationId(l.getOrganizationId());
        dto.setType(l.getType());
        dto.setStartDate(l.getStartDate());
        dto.setEndDate(l.getEndDate());
        dto.setReason(l.getReason());
        dto.setStatus(l.getStatus());
        dto.setApprovedBy(l.getApprovedBy());
        dto.setApprovedAt(l.getApprovedAt());
        dto.setRejectionReason(l.getRejectionReason());
        dto.setCreatedAt(l.getCreatedAt());
        return dto;
    }

    public List<LeaveResponseDto> getMyLeaves() {
        User user = currentUser();
        return leaveRepository.findByEmployeeId(user.getId()).stream().map(this::toDto).toList();
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void checkOrgAccess(User user, String orgId) {
        if (!permissionService.canAccessOrganization(user, orgId))
            throw new ForbiddenException("Access denied for this organization");
    }
}
