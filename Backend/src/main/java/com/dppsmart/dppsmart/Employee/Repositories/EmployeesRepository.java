package com.dppsmart.dppsmart.Employee.Repositories;

import com.dppsmart.dppsmart.Employee.Entities.Employees;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EmployeesRepository extends MongoRepository<Employees, String> {
    List<Employees> findByOrganizationId(String organizationId);
}

