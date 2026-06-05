package com.dppsmart.dppsmart.Department.Services;

import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Department.DTO.CreateDepartmentDto;
import com.dppsmart.dppsmart.Department.DTO.DepartmentResponseDto;
import com.dppsmart.dppsmart.Department.Entities.Department;
import com.dppsmart.dppsmart.Department.Repositories.DepartmentRepository;
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
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public DepartmentResponseDto create(CreateDepartmentDto dto) {
        User user = currentUser();
        checkAdminOrSubAdmin(user);
        checkOrgAccess(user, dto.getOrganizationId());

        Department dept = new Department();
        dept.setName(dto.getName());
        dept.setDescription(dto.getDescription());
        dept.setOrganizationId(dto.getOrganizationId());
        dept.setActive(true);
        dept.setCreatedAt(LocalDateTime.now());
        dept.setUpdatedAt(LocalDateTime.now());
        Department saved = departmentRepository.save(dept);
        auditService.log("Department", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Department created: " + saved.getName());
        return toDto(saved);
    }

    public DepartmentResponseDto update(String id, CreateDepartmentDto dto) {
        User user = currentUser();
        checkAdminOrSubAdmin(user);
        Department dept = departmentRepository.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
        checkOrgAccess(user, dept.getOrganizationId());
        if (dto.getName() != null && !dto.getName().isBlank()) dept.setName(dto.getName());
        if (dto.getDescription() != null) dept.setDescription(dto.getDescription());
        dept.setUpdatedAt(LocalDateTime.now());
        Department saved = departmentRepository.save(dept);
        auditService.log("Department", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Department updated: " + saved.getName());
        return toDto(saved);
    }

    public void delete(String id) {
        User user = currentUser();
        checkAdminOrSubAdmin(user);
        Department dept = departmentRepository.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
        checkOrgAccess(user, dept.getOrganizationId());
        dept.setActive(false);
        dept.setUpdatedAt(LocalDateTime.now());
        departmentRepository.save(dept);
        auditService.log("Department", id, "DELETE", dept.getOrganizationId(), null, "Department deactivated: " + dept.getName());
    }

    public List<DepartmentResponseDto> getByOrganization(String organizationId) {
        User user = currentUser();
        checkOrgAccess(user, organizationId);
        return departmentRepository.findByOrganizationId(organizationId).stream().map(this::toDto).toList();
    }

    public List<DepartmentResponseDto> getAll() {
        User user = currentUser();
        return departmentRepository.findAll().stream()
                .filter(d -> permissionService.canAccessOrganization(user, d.getOrganizationId()))
                .map(this::toDto).toList();
    }

    public DepartmentResponseDto getById(String id) {
        User user = currentUser();
        Department dept = departmentRepository.findById(id).orElseThrow(() -> new NotFoundException("Department not found"));
        checkOrgAccess(user, dept.getOrganizationId());
        return toDto(dept);
    }

    private DepartmentResponseDto toDto(Department d) {
        DepartmentResponseDto dto = new DepartmentResponseDto();
        dto.setId(d.getId());
        dto.setName(d.getName());
        dto.setDescription(d.getDescription());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setActive(d.isActive());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        return dto;
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void checkAdminOrSubAdmin(User user) {
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
    }

    private void checkOrgAccess(User user, String orgId) {
        if (!permissionService.canAccessOrganization(user, orgId))
            throw new ForbiddenException("Access denied for this organization");
    }
}
