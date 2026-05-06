package com.dppsmart.dppsmart.Audit.Controllers;

import com.dppsmart.dppsmart.Audit.DTO.AuditLogDto;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public Page<AuditLogDto> getLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String organizationId,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        return auditService.getLogs(entityType, organizationId, userEmail, action, startDate, endDate, pageable);
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public Page<AuditLogDto> getEntityLogs(
            @PathVariable String entityType,
            @PathVariable String entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        return auditService.getEntityLogs(entityType, entityId, pageable);
    }
}
