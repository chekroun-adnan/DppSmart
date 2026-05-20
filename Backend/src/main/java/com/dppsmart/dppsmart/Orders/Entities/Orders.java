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
    private boolean hasReservations;
    private LocalDateTime reservedUntil;

    // workflow tracking
    private List<String> relatedProductionIds;
    private String supplyChainOrderId;
    private LocalDateTime stockCheckedAt;
    private LocalDateTime productionStartedAt;
    private LocalDateTime productionCompletedAt;
    private LocalDateTime deliveryReadyAt;
    private String confirmedBy;
    private String deliveredBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
