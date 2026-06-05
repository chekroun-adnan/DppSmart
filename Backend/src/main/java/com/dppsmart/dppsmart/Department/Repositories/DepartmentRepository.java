package com.dppsmart.dppsmart.Department.Repositories;

import com.dppsmart.dppsmart.Department.Entities.Department;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DepartmentRepository extends MongoRepository<Department, String> {
    List<Department> findByOrganizationId(String organizationId);
    List<Department> findByOrganizationIdAndActiveTrue(String organizationId);
    boolean existsByNameAndOrganizationId(String name, String organizationId);
}
