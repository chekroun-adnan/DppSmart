package com.dppsmart.dppsmart.Task.Repositories;

import com.dppsmart.dppsmart.Task.Entities.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByOrganizationId(String organizationId);
    List<Task> findByAssignedEmployeeIdsContaining(String employeeId);
    List<Task> findByOrganizationIdAndAssignedEmployeeIdsContaining(String organizationId, String employeeId);
}
