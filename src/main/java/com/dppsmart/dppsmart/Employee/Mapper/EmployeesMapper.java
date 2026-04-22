package com.dppsmart.dppsmart.Employee.Mapper;

import com.dppsmart.dppsmart.Employee.DTO.EmployeeResponseDto;
import com.dppsmart.dppsmart.Employee.Entities.Employees;

public class EmployeesMapper {
    public static EmployeeResponseDto toDto(Employees employee) {
        EmployeeResponseDto dto = new EmployeeResponseDto();
        dto.setId(employee.getId());
        dto.setFullName(employee.getFullName());
        dto.setRole(employee.getRole());
        dto.setDepartment(employee.getDepartment());
        dto.setPerformanceScore(employee.getPerformanceScore());
        dto.setOrganizationId(employee.getOrganizationId());
        dto.setCreatedAt(employee.getCreatedAt());
        dto.setUpdatedAt(employee.getUpdatedAt());
        dto.setCreatedBy(employee.getCreatedBy());
        dto.setUpdatedBy(employee.getUpdatedBy());
        return dto;
    }
}

