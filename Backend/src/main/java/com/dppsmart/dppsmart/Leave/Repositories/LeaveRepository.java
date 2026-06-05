package com.dppsmart.dppsmart.Leave.Repositories;

import com.dppsmart.dppsmart.Leave.Entities.LeaveRequest;
import com.dppsmart.dppsmart.Leave.Entities.LeaveStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LeaveRepository extends MongoRepository<LeaveRequest, String> {
    List<LeaveRequest> findByEmployeeId(String employeeId);
    List<LeaveRequest> findByOrganizationId(String organizationId);
    List<LeaveRequest> findByOrganizationIdAndStatus(String organizationId, LeaveStatus status);
    long countByEmployeeIdAndStatus(String employeeId, LeaveStatus status);
}
