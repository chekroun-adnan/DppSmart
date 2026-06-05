package com.dppsmart.dppsmart.Attendance.Repositories;

import com.dppsmart.dppsmart.Attendance.Entities.Attendance;
import com.dppsmart.dppsmart.Attendance.Entities.AttendanceStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findByEmployeeId(String employeeId);
    List<Attendance> findByOrganizationId(String organizationId);
    List<Attendance> findByOrganizationIdAndCheckInBetween(String organizationId, LocalDateTime from, LocalDateTime to);
    Optional<Attendance> findByEmployeeIdAndStatus(String employeeId, AttendanceStatus status);
    long countByOrganizationIdAndStatusAndCheckInBetween(String organizationId, AttendanceStatus status, LocalDateTime from, LocalDateTime to);
}
