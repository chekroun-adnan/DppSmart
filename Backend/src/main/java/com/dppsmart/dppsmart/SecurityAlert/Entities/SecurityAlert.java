package com.dppsmart.dppsmart.SecurityAlert.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "security_alerts")
@CompoundIndex(name = "org_status", def = "{'organizationId':1, 'status':1, 'createdAt':-1}")
@CompoundIndex(name = "org_severity", def = "{'organizationId':1, 'severity':1, 'createdAt':-1}")
@CompoundIndex(name = "org_module", def = "{'organizationId':1, 'sourceModule':1, 'createdAt':-1}")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SecurityAlert {

    @Id
    private String id;

    @Indexed
    private String type;

    @Indexed
    private Severity severity;

    @Indexed
    private String sourceModule;

    private String entityId;

    @Indexed
    private String userId;

    @Indexed
    private String organizationId;

    private String description;
    private String ruleBasedReason;

    private String aiExplanation;
    private String aiRecommendation;

    private Integer riskScore;

    @Indexed
    private AlertStatus status;

    @Indexed
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

    public enum AlertStatus { OPEN, INVESTIGATING, RESOLVED }
}
