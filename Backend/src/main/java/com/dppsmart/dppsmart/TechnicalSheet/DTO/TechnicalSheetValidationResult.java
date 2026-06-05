package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class TechnicalSheetValidationResult {
    private boolean valid;
    private String orderId;
    private String orderNumber;
    private List<TechnicalSheetIssue> issues;
}
