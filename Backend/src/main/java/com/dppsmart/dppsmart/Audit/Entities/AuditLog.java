package com.dppsmart.dppsmart.Audit.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "audit_logs")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuditLog {

    @Id
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
