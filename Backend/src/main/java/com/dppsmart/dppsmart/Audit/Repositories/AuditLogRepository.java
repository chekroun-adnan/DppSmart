package com.dppsmart.dppsmart.Audit.Repositories;

import com.dppsmart.dppsmart.Audit.Entities.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    Page<AuditLog> findByOrganizationId(String organizationId, Pageable pageable);

    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);

    Page<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);

    Page<AuditLog> findByUserEmail(String userEmail, Pageable pageable);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    Page<AuditLog> findByOrganizationIdAndEntityType(String organizationId, String entityType, Pageable pageable);

    Page<AuditLog> findByOrganizationIdAndUserEmail(String organizationId, String userEmail, Pageable pageable);

    Page<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<AuditLog> findByOrganizationIdAndTimestampBetween(String organizationId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    List<AuditLog> findTop50ByOrganizationIdOrderByTimestampDesc(String organizationId);

    List<AuditLog> findTop50ByOrderByTimestampDesc();
}
