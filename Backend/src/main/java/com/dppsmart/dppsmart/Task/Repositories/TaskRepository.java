package com.dppsmart.dppsmart.Task.Repositories;

import com.dppsmart.dppsmart.Task.Entities.Task;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByOrganizationId(String organizationId);
    List<Task> findByAssignedEmployeeId(String employeeId);
    List<Task> findByOrganizationIdAndAssignedEmployeeId(String organizationId, String employeeId);
    List<Task> findByAssignedDepartmentId(String departmentId);
    List<Task> findByStatus(TaskStatus status);
    List<Task> findByOrganizationIdAndStatusIn(String organizationId, List<TaskStatus> statuses);
    List<Task> findByAssignedEmployeeIdAndStatusIn(String employeeId, List<TaskStatus> statuses);
    List<Task> findByOperationId(String operationId);
    List<Task> findByProductionOrderId(String productionOrderId);
    List<Task> findByPlannedEndBeforeAndStatusNotIn(LocalDateTime date, List<TaskStatus> statuses);
    long countByOrganizationIdAndStatus(String organizationId, TaskStatus status);
    long countByOrganizationIdAndStatusIn(String organizationId, List<TaskStatus> statuses);
    long countByAssignedEmployeeIdAndCreatedAtAfter(String employeeId, LocalDateTime date);
    long countByAssignedEmployeeIdAndStatus(String employeeId, TaskStatus status);
    long countByAssignedEmployeeIdAndStatusIn(String employeeId, List<TaskStatus> statuses);
    long countByOrganizationId(String organizationId);
}
