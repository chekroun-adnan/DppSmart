package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TechnicalSheetIssue {
    private String productId;
    private String productName;
    private String severity;
    private String type;
    private String message;
}
