package com.dppsmart.dppsmart.Billing.Entities;

import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Enums.PaymentRecordStatus;
import com.dppsmart.dppsmart.Billing.Enums.PaymentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    @Id
    private String id;

    private String orderId;
    private String clientId;
    private String organizationId;

    private Double amount;
    private String currency;

    private PaymentMethod paymentMethod;
    private PaymentType paymentType;

    private String referenceNumber;
    private String paymentProofUrl;

    private PaymentRecordStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime validatedAt;
    private String validatedBy;

    private String notes;

    private String provider;
    private String paypalOrderId;
    private String paypalCaptureId;

    private String invoiceId;
}
