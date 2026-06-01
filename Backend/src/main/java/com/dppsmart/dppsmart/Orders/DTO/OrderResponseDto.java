package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
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
    private LocalDateTime productionCompletedAt;
    private LocalDateTime deliveryReadyAt;
    private String confirmedBy;
    private String deliveredBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
