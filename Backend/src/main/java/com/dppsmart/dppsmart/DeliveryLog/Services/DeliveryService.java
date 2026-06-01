package com.dppsmart.dppsmart.DeliveryLog.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Allocation.Services.ReservationService;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.DeliveryLog.Entities.DeliveryLog;
import com.dppsmart.dppsmart.DeliveryLog.Repositories.DeliveryLogRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.User.Entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service("deliveryLogService")
@RequiredArgsConstructor
public class DeliveryService {

    private final OrdersRepository ordersRepository;
    private final DeliveryLogRepository deliveryLogRepository;
    private final ReservationService reservationService;
    private final StockMovementService stockMovementService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final PermissionService permissionService;

    @Transactional
    public DeliveryLog sendToDelivery(String orderId, List<DeliveryLog.DeliveryItem> partialItems, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (!permissionService.canAccessOrganization(user, order.getOrganizationId()))
            throw new ForbiddenException("Access denied");

        boolean isPartial = partialItems != null && !partialItems.isEmpty();

        if (isPartial) {
            if (order.getStatus() != ClientOrderStatus.STOCK_RESERVED
                    && order.getStatus() != ClientOrderStatus.READY_FOR_DELIVERY
                    && order.getStatus() != ClientOrderStatus.PARTIALLY_DELIVERED) {
                throw new BadRequestException("Order cannot be partially delivered in status: " + order.getStatus());
            }
        } else {
            if (order.getStatus() != ClientOrderStatus.STOCK_RESERVED
                    && order.getStatus() != ClientOrderStatus.READY_FOR_DELIVERY) {
                throw new BadRequestException("Order cannot be delivered in status: " + order.getStatus());
            }
        }

        reservationService.consumeProductReservations(orderId);

        List<DeliveryLog.DeliveryItem> deliveryItems;
        if (isPartial) {
            deliveryItems = partialItems;
        } else {
            deliveryItems = order.getItems().stream()
                    .map(item -> new DeliveryLog.DeliveryItem(
                            item.getProductId(), item.getProductName(), item.getQuantity(), item.getUnit()))
                    .collect(Collectors.toList());
        }

        for (DeliveryLog.DeliveryItem di : deliveryItems) {
            stockMovementService.recordProductMovement(
                    MovementType.PRODUCT_DELIVERED, di.getProductId(), di.getProductName(),
                    di.getUnit(), di.getQuantity(),
                    0, 0, orderId, order.getRelatedProductionId(),
                    order.getOrganizationId(), user.getEmail());
        }

        DeliveryLog log = new DeliveryLog();
        log.setId(NanoIdUtils.randomNanoId());
        log.setOrderId(orderId);
        log.setOrganizationId(order.getOrganizationId());
        log.setCreatedBy(user.getEmail());
        log.setType(isPartial ? DeliveryLog.DeliveryType.PARTIAL : DeliveryLog.DeliveryType.FULL);
        log.setItems(deliveryItems);
        log.setStatus(DeliveryLog.DeliveryStatus.DELIVERED);
        log.setCreatedAt(LocalDateTime.now());
        log.setDeliveredAt(LocalDateTime.now());

        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());

        if (isPartial) {
            order.setStatus(ClientOrderStatus.PARTIALLY_DELIVERED);
        } else {
            order.setStatus(ClientOrderStatus.DELIVERED);
        }

        ordersRepository.save(order);

        reservationService.releaseReservations(orderId);

        DeliveryLog saved = deliveryLogRepository.save(log);

        auditService.log("Delivery", saved.getId(), "CREATE", order.getOrganizationId(), null,
                (isPartial ? "Partial" : "Full") + " delivery for order " + order.getOrderReference());

        notificationService.createNotification(order.getClientId(),
                isPartial ? "Order Partially Delivered" : "Order Delivered",
                "Order " + order.getOrderReference() + " has been " + (isPartial ? "partially " : "") + "delivered.",
                Notification.NotificationType.DELIVERY, "/orders/" + orderId);

        return saved;
    }

    public List<DeliveryLog> getDeliveryLogs(String orderId) {
        return deliveryLogRepository.findByOrderId(orderId);
    }
}
