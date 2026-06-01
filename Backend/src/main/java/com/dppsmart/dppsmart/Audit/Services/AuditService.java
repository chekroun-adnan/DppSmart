package com.dppsmart.dppsmart.Audit.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.DTO.AuditLogDto;
import com.dppsmart.dppsmart.Audit.Entities.AuditLog;
import com.dppsmart.dppsmart.Audit.Repositories.AuditLogRepository;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public void log(String entityType, String entityId, String action, String organizationId, Map<String, Object> changes, String description) {
        try {
            User user = getCurrentUser();
            AuditLog log = new AuditLog();
            log.setId(NanoIdUtils.randomNanoId());
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setAction(action);
            log.setUserId(user.getId());
            log.setUserEmail(user.getEmail());
            log.setTimestamp(LocalDateTime.now());
            log.setChanges(changes);
            log.setOrganizationId(organizationId);
            log.setDescription(description);
            auditLogRepository.save(log);
        } catch (Exception e) {

        }
    }

    public Page<AuditLogDto> getLogs(String entityType, String organizationId, String userEmail, String action, String startDate, String endDate, Pageable pageable) {
        User user = getCurrentUser();
        boolean isAdmin = user.getRole() == Roles.ADMIN;

        LocalDateTime start = startDate != null ? LocalDateTime.parse(startDate) : null;
        LocalDateTime end = endDate != null ? LocalDateTime.parse(endDate) : null;

        if (!isAdmin && organizationId != null && !permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }

        if (!isAdmin) {
            organizationId = user.getOrganizationId();
        }

        Page<AuditLog> logs;

        if (organizationId != null && start != null && end != null) {
            logs = auditLogRepository.findByOrganizationIdAndTimestampBetween(organizationId, start, end, pageable);
        } else if (organizationId != null && entityType != null && userEmail != null) {
            logs = auditLogRepository.findByOrganizationIdAndUserEmail(organizationId, userEmail, pageable);
        } else if (organizationId != null && entityType != null) {
            logs = auditLogRepository.findByOrganizationIdAndEntityType(organizationId, entityType, pageable);
        } else if (organizationId != null && userEmail != null) {
            logs = auditLogRepository.findByOrganizationIdAndUserEmail(organizationId, userEmail, pageable);
        } else if (organizationId != null) {
            logs = auditLogRepository.findByOrganizationId(organizationId, pageable);
        } else if (entityType != null) {
            logs = auditLogRepository.findByEntityType(entityType, pageable);
        } else if (userEmail != null) {
            logs = auditLogRepository.findByUserEmail(userEmail, pageable);
        } else if (action != null) {
            logs = auditLogRepository.findByAction(action, pageable);
        } else if (start != null && end != null) {
            logs = auditLogRepository.findByTimestampBetween(start, end, pageable);
        } else {
            logs = auditLogRepository.findAll(pageable);
        }

        return logs.map(this::toDto);
    }

    public Page<AuditLogDto> getEntityLogs(String entityType, String entityId, Pageable pageable) {
        User user = getCurrentUser();
        boolean isAdmin = user.getRole() == Roles.ADMIN;

        if (!isAdmin) {
            return auditLogRepository.findByOrganizationIdAndEntityType(
                    user.getOrganizationId(), entityType, pageable
            ).map(this::toDto);
        }

        return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId, pageable)
                .map(this::toDto);
    }

    private AuditLogDto toDto(AuditLog log) {
        return new AuditLogDto(
                log.getId(),
                log.getEntityType(),
                log.getEntityId(),
                log.getAction(),
                log.getUserId(),
                log.getUserEmail(),
                log.getTimestamp(),
                log.getChanges(),
                log.getOrganizationId(),
                log.getDescription()
        );
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
