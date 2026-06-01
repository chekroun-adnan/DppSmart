package com.dppsmart.dppsmart.SecurityAlert.DTO;

import com.dppsmart.dppsmart.SecurityAlert.Entities.SecurityAlert;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecurityAlertResponseDto {
    private String id;
    private String type;
    private String severity;
    private String sourceModule;
    private String entityId;
    private String userId;
    private String organizationId;
    private String description;
    private String ruleBasedReason;
    private String aiExplanation;
    private String aiRecommendation;
    private Integer riskScore;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static SecurityAlertResponseDto from(SecurityAlert a) {
        SecurityAlertResponseDto dto = new SecurityAlertResponseDto();
        dto.setId(a.getId());
        dto.setType(a.getType());
        dto.setSeverity(a.getSeverity() != null ? a.getSeverity().name() : null);
        dto.setSourceModule(a.getSourceModule());
        dto.setEntityId(a.getEntityId());
        dto.setUserId(a.getUserId());
        dto.setOrganizationId(a.getOrganizationId());
        dto.setDescription(a.getDescription());
        dto.setRuleBasedReason(a.getRuleBasedReason());
        dto.setAiExplanation(a.getAiExplanation());
        dto.setAiRecommendation(a.getAiRecommendation());
        dto.setRiskScore(a.getRiskScore());
        dto.setStatus(a.getStatus() != null ? a.getStatus().name() : null);
        dto.setCreatedAt(a.getCreatedAt());
        dto.setResolvedAt(a.getResolvedAt());
        return dto;
    }
}
