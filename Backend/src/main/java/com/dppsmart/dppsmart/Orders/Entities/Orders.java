package com.dppsmart.dppsmart.Orders.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "orders")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Orders {

    @Id
    private String id;
    private String orderReference;
    private String clientId;
    private String organizationId;

    private MaterialSource materialSource = MaterialSource.COMPANY_SUPPLIED;

    private List<OrderItem> items;

    private LocalDate requestedDeliveryDate;
    private LocalDate confirmedDeliveryDate;
    private LocalDate proposedDeliveryDate;

    private String adminMessage;
    private String clientResponseMessage;

    private ClientOrderStatus status;

    private Integer totalQuantity;
    private boolean overallMaterialsSufficient;

    private String relatedProductionId;
    private String deliveryToken;

    private OrderPriority orderPriority;
    private Integer priority;
    private String allocationSessionId;

    private List<String> relatedProductionIds;
    private String supplyChainOrderId;
    private LocalDateTime stockCheckedAt;
    private LocalDateTime productionStartedAt;
    private String productionStartedBy;
    private LocalDateTime productionCompletedAt;
    private LocalDateTime deliveryReadyAt;
    private String confirmedBy;
    private String deliveredBy;

    private LocalDateTime plannedStartDateTime;
    private LocalDateTime plannedEndDateTime;
    private LocalDateTime forecastEndDateTime;
    private String delayStatus;
    private Integer priorityScore;
    private String healthStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // Billing
    private Double totalProductionCost;
    private Double totalMaterialCost;
    private String billingStatus;
    private String quoteId;
    private String invoiceId;
    private Double subtotal;
    private Double taxAmount;
    private Double discountAmount;
    private Double totalPrice;
    private String currency;

    private ManufacturingMode manufacturingMode;

    private OrderPaymentStatus paymentStatus;
    private Double amountDue;
    private Double amountPaid;
    private Double depositPercent;
    private Double depositAmount;
    private Double remainingBalance;
    private String depositPaymentId;
    private String finalPaymentId;

    private Double materialCost;
    private Double productionCost;
    private Double totalCost;
    private Double profit;
    private Double marginPercent;
}
