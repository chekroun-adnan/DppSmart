package com.dppsmart.dppsmart.Employee.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.DTO.CreateEmployeeDto;
import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.DTO.UpdateEmployeeDto;
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Mapper.EmployeesMapper;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
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
public class EmployeesService {
    private final EmployeesRepository employeesRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

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

        Employees employee = new Employees();
        employee.setId(NanoIdUtils.randomNanoId());
        employee.setFullName(dto.getFullName());
        employee.setRole(dto.getRole());
        employee.setDepartment(dto.getDepartment());
        employee.setPerformanceScore(dto.getPerformanceScore());
        employee.setOrganizationId(dto.getOrganizationId());
        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());
        employee.setCreatedBy(user.getEmail());
        employee.setUpdatedBy(user.getEmail());

        return EmployeesMapper.toDto(employeesRepository.save(employee));
    }

    public EmployeeResponseDto update(UpdateEmployeeDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update employees");
        }

        Employees employee = employeesRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Employee not found"));

        if (!permissionService.canAccessOrganization(user, employee.getOrganizationId())) {
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
        if (dto.getRole() != null && !dto.getRole().isBlank()) employee.setRole(dto.getRole());
        if (dto.getDepartment() != null && !dto.getDepartment().isBlank()) employee.setDepartment(dto.getDepartment());
        if (dto.getPerformanceScore() != null) employee.setPerformanceScore(dto.getPerformanceScore());

        employee.setUpdatedAt(LocalDateTime.now());
        employee.setUpdatedBy(user.getEmail());

        return EmployeesMapper.toDto(employeesRepository.save(employee));
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
        return employeesRepository.findAll().stream()
                .filter(e -> permissionService.canAccessOrganization(user, e.getOrganizationId()))
                .map(EmployeesMapper::toDto)
                .toList();
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

        Employees employee = employeesRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Employee not found"));

        if (!permissionService.canAccessOrganization(user, employee.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this employee");
        }

        employeesRepository.deleteById(id);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

