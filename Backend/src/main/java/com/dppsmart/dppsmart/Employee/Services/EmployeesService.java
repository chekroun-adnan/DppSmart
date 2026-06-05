package com.dppsmart.dppsmart.Employee.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Department.Entities.Department;
import com.dppsmart.dppsmart.Department.Repositories.DepartmentRepository;
import com.dppsmart.dppsmart.Employee.DTO.CreateEmployeeDto;
import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.DTO.UpdateEmployeeDto;
import com.dppsmart.dppsmart.Employee.Entities.EmployeeStatus;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Mapper.EmployeesMapper;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeesService {
    private final EmployeesRepository employeesRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final DepartmentRepository departmentRepository;

    public EmployeeResponseDto create(CreateEmployeeDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to create employees");
        }

        if (!organizationRepository.existsById(dto.getOrganizationId())) {
            throw new NotFoundException("Organization not found");
        }
        if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        String employeeId = NanoIdUtils.randomNanoId();

        User empUser = new User();
        empUser.setId(employeeId);
        empUser.setName(dto.getFullName());
        empUser.setEmail(dto.getEmail());
        empUser.setPassword(passwordEncoder.encode(dto.getPassword()));
        empUser.setRole(Roles.EMPLOYEE);
        empUser.setOrganizationId(dto.getOrganizationId());
        empUser.setCreatedAt(LocalDateTime.now());
        userRepository.save(empUser);

        long count = employeesRepository.count() + 1;
        String employeeCode = "EMP-" + String.format("%04d", count);

        String deptName = null;
        if (dto.getDepartmentId() != null && !dto.getDepartmentId().isBlank()) {
            deptName = departmentRepository.findById(dto.getDepartmentId())
                    .map(Department::getName).orElse(null);
        }

        Employees employee = new Employees();
        employee.setId(employeeId);
        employee.setEmployeeCode(employeeCode);
        employee.setFullName(dto.getFullName());
        employee.setFirstName(dto.getFirstName());
        employee.setLastName(dto.getLastName());
        employee.setEmail(dto.getEmail());
        employee.setPhone(dto.getPhone());
        employee.setAddress(dto.getAddress());
        employee.setPosition(dto.getPosition());
        employee.setDepartmentId(dto.getDepartmentId());
        employee.setDepartmentName(deptName);
        employee.setHireDate(dto.getHireDate());
        employee.setSalary(dto.getSalary());
        employee.setNotes(dto.getNotes());
        employee.setSkills(dto.getSkills() != null ? dto.getSkills() : new java.util.ArrayList<>());
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setActive(true);
        employee.setRole(dto.getRole() != null && !dto.getRole().isBlank() ? dto.getRole() : "EMPLOYEE");
        employee.setOrganizationId(dto.getOrganizationId());
        employee.setQrCode(employeeCode);
        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());
        employee.setCreatedBy(user.getEmail());
        employee.setUpdatedBy(user.getEmail());

        Employees saved = employeesRepository.save(employee);
        auditService.log("Employee", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Employee created: " + saved.getFullName());

        notificationService.createNotification(
                user.getId(),
                "New Employee Created",
                saved.getFullName() + " has been added as " + saved.getRole(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.TASK,
                "/employees/" + saved.getId()
        );

        return EmployeesMapper.toDto(saved);
    }

    public EmployeeResponseDto update(UpdateEmployeeDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update employees");
        }

        Employees employee = employeesRepository.findById(dto.getId())
                .orElseGet(() -> {
                    User sourceUser = userRepository.findById(dto.getId())
                            .filter(u -> u.getRole() == Roles.EMPLOYEE)
                            .orElseThrow(() -> new NotFoundException("Employee not found"));
                    Employees emp = new Employees();
                    emp.setId(sourceUser.getId());
                    emp.setFullName(sourceUser.getName());
                    emp.setRole("EMPLOYEE");
                    emp.setOrganizationId(sourceUser.getOrganizationId());
                    emp.setCreatedAt(sourceUser.getCreatedAt());
                    emp.setUpdatedAt(sourceUser.getCreatedAt());
                    emp.setCreatedBy(sourceUser.getEmail());
                    emp.setUpdatedBy(sourceUser.getEmail());
                    return employeesRepository.save(emp);
                });

        if (user.getRole() != Roles.ADMIN && !permissionService.canAccessOrganization(user, employee.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this employee");
        }

        if (dto.getOrganizationId() != null && !dto.getOrganizationId().isBlank()) {
            if (!organizationRepository.existsById(dto.getOrganizationId())) {
                throw new NotFoundException("Organization not found");
            }
            if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to move employee to another organization");
            }
            employee.setOrganizationId(dto.getOrganizationId());
        }

        if (dto.getFullName() != null && !dto.getFullName().isBlank()) employee.setFullName(dto.getFullName());
        if (dto.getFirstName() != null) employee.setFirstName(dto.getFirstName());
        if (dto.getLastName() != null) employee.setLastName(dto.getLastName());
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) employee.setEmail(dto.getEmail());
        if (dto.getRole() != null && !dto.getRole().isBlank()) employee.setRole(dto.getRole());
        if (dto.getPhone() != null) employee.setPhone(dto.getPhone());
        if (dto.getAddress() != null) employee.setAddress(dto.getAddress());
        if (dto.getPosition() != null) employee.setPosition(dto.getPosition());
        if (dto.getDepartmentId() != null) {
            employee.setDepartmentId(dto.getDepartmentId());
            employee.setDepartmentName(departmentRepository.findById(dto.getDepartmentId())
                    .map(Department::getName).orElse(null));
        }
        if (dto.getHireDate() != null) employee.setHireDate(dto.getHireDate());
        if (dto.getStatus() != null) employee.setStatus(dto.getStatus());
        if (dto.getSalary() != null) employee.setSalary(dto.getSalary());
        if (dto.getNotes() != null) employee.setNotes(dto.getNotes());
        if (dto.getActive() != null) employee.setActive(dto.getActive());
        if (dto.getSkills() != null) employee.setSkills(dto.getSkills());

        employee.setUpdatedAt(LocalDateTime.now());
        employee.setUpdatedBy(user.getEmail());

        userRepository.findById(employee.getId()).ifPresent(empUser -> {
            if (dto.getFullName() != null && !dto.getFullName().isBlank()) empUser.setName(dto.getFullName());
            if (dto.getEmail() != null && !dto.getEmail().isBlank()) empUser.setEmail(dto.getEmail());
            userRepository.save(empUser);
        });

        Employees saved = employeesRepository.save(employee);
        auditService.log("Employee", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Employee updated: " + saved.getFullName());

        return EmployeesMapper.toDto(saved);
    }

    public EmployeeResponseDto getById(String id) {
        User user = getCurrentUser();
        Employees employee = employeesRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Employee not found"));

        if (!permissionService.canAccessOrganization(user, employee.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this employee");
        }

        return EmployeesMapper.toDto(employee);
    }

    public List<EmployeeResponseDto> getAll() {
        User user = getCurrentUser();

        List<EmployeeResponseDto> fromRepo = employeesRepository.findAll().stream()
                .filter(e -> permissionService.canAccessOrganization(user, e.getOrganizationId()))
                .map(EmployeesMapper::toDto)
                .toList();

        java.util.Set<String> knownIds = fromRepo.stream()
                .map(EmployeeResponseDto::getId)
                .collect(java.util.stream.Collectors.toSet());

        boolean isAdmin = user.getRole() == Roles.ADMIN;

        List<EmployeeResponseDto> fromUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Roles.EMPLOYEE && !knownIds.contains(u.getId()))
                .filter(u -> isAdmin || u.getOrganizationId() == null || permissionService.canAccessOrganization(user, u.getOrganizationId()))
                .map(u -> {
                    EmployeeResponseDto dto = new EmployeeResponseDto();
                    dto.setId(u.getId());
                    dto.setFullName(u.getName());
                    dto.setEmail(u.getEmail());
                    dto.setRole("EMPLOYEE");
                    dto.setOrganizationId(u.getOrganizationId());
                    dto.setCreatedAt(u.getCreatedAt());
                    dto.setUpdatedAt(u.getUpdatedAt());
                    return dto;
                })
                .toList();

        List<EmployeeResponseDto> merged = new java.util.ArrayList<>(fromRepo);
        merged.addAll(fromUsers);
        return merged;
    }

    public List<EmployeeResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return employeesRepository.findByOrganizationId(organizationId)
                .stream()
                .map(EmployeesMapper::toDto)
                .toList();
    }

    public void delete(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to delete employees");
        }

        Employees employee = employeesRepository.findById(id).orElse(null);
        if (employee == null) {
            if (!userRepository.existsById(id)) throw new NotFoundException("Employee not found");
        } else if (user.getRole() != Roles.ADMIN && !permissionService.canAccessOrganization(user, employee.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this employee");
        }

        String orgId = employee != null ? employee.getOrganizationId() : null;
        String fullName = employee != null ? employee.getFullName() : id;
        if (employee != null) employeesRepository.deleteById(id);
        userRepository.findById(id).ifPresent(u -> {
            if (u.getRole() == Roles.EMPLOYEE) userRepository.delete(u);
        });
        auditService.log("Employee", id, "DELETE", orgId, null, "Employee deleted: " + fullName);

        notificationService.createNotification(
                user.getId(),
                "Employee Deleted",
                fullName + " has been removed from the team",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.TASK,
                "/employees"
        );
    }

    public EmployeeResponseDto getMe() {
        User user = getCurrentUser();
        return employeesRepository.findById(user.getId())
                .map(EmployeesMapper::toDto)
                .orElseGet(() -> {
                    EmployeeResponseDto dto = new EmployeeResponseDto();
                    dto.setId(user.getId());
                    dto.setFullName(user.getName());
                    dto.setEmail(user.getEmail());
                    dto.setOrganizationId(user.getOrganizationId());
                    dto.setRole(user.getRole().name());
                    dto.setActive(true);
                    return dto;
                });
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

