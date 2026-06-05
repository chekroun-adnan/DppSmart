package com.dppsmart.dppsmart.Employee.Repositories;

import com.dppsmart.dppsmart.Employee.Entities.Employees;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeesRepository extends MongoRepository<Employees, String> {
    List<Employees> findByOrganizationId(String organizationId);
    Optional<Employees> findByEmail(String email);
}

