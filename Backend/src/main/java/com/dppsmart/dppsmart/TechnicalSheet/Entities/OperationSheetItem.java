package com.dppsmart.dppsmart.TechnicalSheet.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ts_operation_items")
@Data
public class OperationSheetItem {
    @Id
    private String id;
    private String technicalSheetId;
    private String operationId;
    private String userId;
    private Integer stepOrder;
    private Double durationEstimate;
    private String notes;
}
