package com.dppsmart.dppsmart.SecurityAlert.Repositories;

import com.dppsmart.dppsmart.SecurityAlert.Entities.SecurityAlert;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SecurityAlertRepository extends MongoRepository<SecurityAlert, String> {

    List<SecurityAlert> findByOrganizationIdOrderByCreatedAtDesc(String organizationId);

    List<SecurityAlert> findByOrganizationIdAndStatusOrderByCreatedAtDesc(
            String organizationId, SecurityAlert.AlertStatus status);

    List<SecurityAlert> findByOrganizationIdAndSeverityOrderByCreatedAtDesc(
            String organizationId, SecurityAlert.Severity severity);

    List<SecurityAlert> findByOrganizationIdAndSourceModuleOrderByCreatedAtDesc(
            String organizationId, String sourceModule);

    List<SecurityAlert> findByOrganizationIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String organizationId, LocalDateTime start, LocalDateTime end);

    Optional<SecurityAlert> findByIdAndOrganizationId(String id, String organizationId);

    long countByOrganizationIdAndStatus(String organizationId, SecurityAlert.AlertStatus status);

    long countByOrganizationIdAndSeverityAndStatus(
            String organizationId, SecurityAlert.Severity severity, SecurityAlert.AlertStatus status);

    long countByOrganizationIdAndSourceModuleAndStatus(
            String organizationId, String sourceModule, SecurityAlert.AlertStatus status);
}
