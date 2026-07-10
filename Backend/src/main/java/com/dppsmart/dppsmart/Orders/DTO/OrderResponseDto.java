package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderPaymentStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderPriority;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderResponseDto {
    private String id;
    private String orderReference;
    private String clientId;
    private String organizationId;
    private List<OrderItem> items;
    private com.dppsmart.dppsmart.Orders.Entities.MaterialSource materialSource;
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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private String productionPriorityBadge;
    private Long priorityScore;

    // Billing
    private String quoteId;
    private String invoiceId;
    private String billingStatus;
    private Double subtotal;
    private Double taxAmount;
    private Double discountAmount;
    private Double totalPrice;
    private String currency;

    // Manufacturing cost snapshots
    private Double totalMaterialCost;
    private Double totalProductionCost;
    private Double materialCost;
    private Double productionCost;
    private Double totalCost;
    private Double profit;
    private Double marginPercent;
    private String manufacturingMode;

    // Payment
    private OrderPaymentStatus paymentStatus;
    private Double amountDue;
    private Double amountPaid;
    private Double depositPercent;

    // Expedition
    private String expeditionId;
    private String expeditionStatus;
    private Integer expeditionPackedQuantity;
    private Integer expeditionRequiredBoxes;
}
