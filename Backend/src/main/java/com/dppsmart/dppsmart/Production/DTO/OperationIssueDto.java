package com.dppsmart.dppsmart.Production.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OperationIssueDto {
    private String id;
    private String stepId;
    private String orderId;
    private String issueType;
    private String title;
    private String description;
    private String createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private String resolvedBy;
    private String resolvedByName;
    private LocalDateTime resolvedAt;
    private boolean resolved;
}
