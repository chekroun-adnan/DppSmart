package com.dppsmart.dppsmart.Department.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DepartmentResponseDto {
    private String id;
    private String name;
    private String description;
    private String organizationId;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
