package com.dppsmart.dppsmart.Audit.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuditLogDto {

    private String id;

    private String entityType;

    private String entityId;

    private String action;

    private String userId;

    private String userEmail;

    private LocalDateTime timestamp;

    private Map<String, Object> changes;

    private String organizationId;

    private String description;
}
