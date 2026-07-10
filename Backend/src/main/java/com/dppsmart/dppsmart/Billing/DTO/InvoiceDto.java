package com.dppsmart.dppsmart.Billing.DTO;

import com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary;

@Data
public class InvoiceDto {
    private String id;
    private String invoiceNumber;
    private String orderId;
    private String quoteId;
    private String clientId;
    private String organizationId;
    private List<InvoiceLineItemDto> items;
    private Double subtotal;
    private Double totalProductionCost;
    private Double totalMaterialCost;
    private Double taxRate;
    private Double taxAmount;
    private Double discountPercent;
    private Double discountAmount;
    private Double total;
    private Double amountPaid;
    private String currency;
    private InvoiceStatus status;
    private String manufacturingMode;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private String notes;
    private String amountInWords;

    private Integer manualTotalBoxes;
    private Integer totalBoxes;
    private Integer shippedQuantity;
    private List<BoxTypeSummary> boxSummaries;
    private String expeditionStatus;
    private LocalDate shipmentDate;

    private boolean hasPdf;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private String createdBy;
}
