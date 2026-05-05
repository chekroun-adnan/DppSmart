package com.dppsmart.dppsmart.Employee.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "employees")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Employees {

    @Id
    private String id;
    private String fullName;
    private String role;
    private String department;
    private Double performanceScore;
    private String organizationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
