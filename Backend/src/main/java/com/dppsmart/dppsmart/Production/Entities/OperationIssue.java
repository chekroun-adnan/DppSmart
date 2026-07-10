package com.dppsmart.dppsmart.Production.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "operation_issues")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OperationIssue {

    @Id
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
