package com.dppsmart.dppsmart.Billing.Entities;

import com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {
    @Id
    private String id;
    private String invoiceNumber;
    private String orderId;
    private String quoteId;
    private String clientId;
    private String organizationId;
    private List<InvoiceLineItem> items;
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
    
    private Integer manualTotalBoxes;
    private Integer totalBoxes;
    private Integer shippedQuantity;
    private List<com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary> boxSummaries;
    private String expeditionStatus;
    private LocalDate shipmentDate;

    private byte[] pdfData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime sentAt;
    private LocalDateTime cancelledAt;
    private String createdBy;
}
