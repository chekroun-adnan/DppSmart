package com.dppsmart.dppsmart.Employee.Mapper;

import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.Entities.EmployeeStatus;
import com.dppsmart.dppsmart.Employee.Entities.Employees;

public class EmployeesMapper {
    public static EmployeeResponseDto toDto(Employees e) {
        EmployeeResponseDto dto = new EmployeeResponseDto();
        dto.setId(e.getId());
        dto.setEmployeeCode(e.getEmployeeCode());
        dto.setFullName(e.getFullName());
        dto.setFirstName(e.getFirstName());
        dto.setLastName(e.getLastName());
        dto.setPhoto(e.getPhoto());
        dto.setEmail(e.getEmail());
        dto.setPhone(e.getPhone());
        dto.setAddress(e.getAddress());
        dto.setPosition(e.getPosition());
        dto.setDepartmentId(e.getDepartmentId());
        dto.setDepartmentName(e.getDepartmentName());
        dto.setOrganizationId(e.getOrganizationId());
        dto.setHireDate(e.getHireDate());
        dto.setStatus(e.getStatus() != null ? e.getStatus() : EmployeeStatus.ACTIVE);
        dto.setSalary(e.getSalary());
        dto.setNotes(e.getNotes());
        dto.setQrCode(e.getQrCode());
        dto.setActive(e.isActive());
        dto.setRole(e.getRole());
        dto.setSkills(e.getSkills());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setUpdatedAt(e.getUpdatedAt());
        dto.setCreatedBy(e.getCreatedBy());
        dto.setUpdatedBy(e.getUpdatedBy());
        return dto;
    }
}
