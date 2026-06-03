package com.dppsmart.dppsmart.Alert.Services;

import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification;
import com.dppsmart.dppsmart.Notification.Repositories.NotificationRepository;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.ProductionCapacity.Entities.ProductionQueue;
import com.dppsmart.dppsmart.ProductionCapacity.Repositories.ProductionCapacityRepository;
import com.dppsmart.dppsmart.ProductionCapacity.Repositories.ProductionQueueRepository;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    @Autowired
    private OrdersRepository ordersRepository;
    @Autowired
    private MaterialStockRepository materialStockRepository;
    @Autowired
    private ProductionCapacityRepository capacityRepository;
    @Autowired
    private ProductionQueueRepository queueRepository;
    @Autowired
    private NotificationServiceImpl notificationService;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    @Scheduled(fixedRate = 300000)
    public void checkLowStockAfterAllocation() {
        log.info("Checking low stock alerts...");

        materialStockRepository.findAll().forEach(ms -> {
            int qty = ms.getQuantity() != null ? ms.getQuantity() : 0;
            int reserved = ms.getReservedQuantity() != null ? ms.getReservedQuantity() : 0;
            int available = qty - reserved;
            int threshold = ms.getMinimumThreshold() != null ? ms.getMinimumThreshold() : 10;

            if (available > threshold) return;

            int displayQty = Math.max(0, available);
            String dedupKey = "LOW_STOCK:" + ms.getOrganizationId() + ":" + ms.getId();
            String title = "Low Stock";
            String message = available <= 0
                    ? "Out of stock: " + ms.getName() + " (available: 0)"
                    : "Low stock: " + ms.getName() + " has only " + displayQty + " " + (ms.getUnit() != null ? ms.getUnit() : "units") + " available.";

            log.info("Stock alert for {}: physical={}, reserved={}, available={}, threshold={}",
                    ms.getName(), qty, reserved, available, threshold);

            notifyAdminsWithDedup(dedupKey, ms.getOrganizationId(), title, message,
                    Notification.NotificationType.ALERT, "/stock");
        });
    }

    @Scheduled(fixedRate = 600000)
    public void checkOverdueOrders() {
        log.info("Checking overdue orders...");
        LocalDate today = LocalDate.now();
        List<Orders> activeOrders = ordersRepository.findAll().stream()
                .filter(o -> o.getConfirmedDeliveryDate() != null
                        && o.getConfirmedDeliveryDate().isBefore(today)
                        && o.getStatus() != ClientOrderStatus.DELIVERED
                        && o.getStatus() != ClientOrderStatus.CANCELLED)
                .toList();

        for (Orders order : activeOrders) {
            notifyAdmins(order.getOrganizationId(), "Overdue Order",
                    "Order " + order.getOrderReference() + " is overdue. Confirmed delivery was "
                            + order.getConfirmedDeliveryDate() + ". Current status: " + order.getStatus(),
                    Notification.NotificationType.ALERT, "/orders/" + order.getId());

            if (order.getClientId() != null) {
                notificationService.createNotification(order.getClientId(), "Order Overdue",
                        "Your order " + order.getOrderReference() + " is past the confirmed delivery date.",
                        Notification.NotificationType.ORDER, "/client-orders/" + order.getId());
            }
        }
    }

    @Scheduled(fixedRate = 600000)
    public void checkDelayedProductionRisk() {
        log.info("Checking delayed production risk...");
        List<ProductionQueue> activeQueues = queueRepository.findAll().stream()
                .filter(q -> q.getStatus() == ProductionQueue.QueueStatus.QUEUED
                        && q.getEstimatedEndDate() != null
                        && q.getEstimatedEndDate().isBefore(LocalDate.now().plusDays(2)))
                .toList();

        for (ProductionQueue q : activeQueues) {
            notifyAdmins(q.getOrganizationId(), "Delayed Production Risk",
                    "Production queue entry " + q.getProductionId() + " at risk of delay. "
                            + "Estimated end: " + q.getEstimatedEndDate(),
                    Notification.NotificationType.ALERT, "/production/" + q.getProductionId());
        }
    }

    @Scheduled(fixedRate = 300000)
    public void checkMachineOverload() {
        log.info("Checking machine overload...");
        capacityRepository.findByOrganizationIdAndIsActiveTrue("").forEach(wc -> {
            int load = queueRepository.countByWorkstationIdAndStatus(wc.getId(), ProductionQueue.QueueStatus.QUEUED);
            if (wc.getDailyCapacity() > 0 && load > wc.getDailyCapacity() * 1.5) {
                notifyAdmins(wc.getOrganizationId(), "Machine Overload",
                        "Workstation " + wc.getWorkstationName() + " is overloaded. "
                                + "Current load: " + load + ", daily capacity: " + wc.getDailyCapacity(),
                        Notification.NotificationType.ALERT, "/production");
            }
        });
    }

    private void notifyAdmins(String organizationId, String title, String message,
                               Notification.NotificationType type, String link) {
        userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.ADMIN).forEach(u ->
                notificationService.createNotification(u.getId(), title, message, type, link));
        userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.SUBADMIN).stream()
                .filter(u -> u.getAssignedOrganizationIds() != null
                        && u.getAssignedOrganizationIds().contains(organizationId))
                .forEach(u -> notificationService.createNotification(u.getId(), title, message, type, link));
    }

    private void notifyAdminsWithDedup(String dedupKey, String organizationId, String title, String message,
                                        Notification.NotificationType type, String link) {
        userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.ADMIN).forEach(u ->
                notificationService.createNotificationWithDedup(u.getId(), title, message, type, link,
                        u.getId() + ":" + dedupKey));
        userRepository.findByRole(com.dppsmart.dppsmart.User.Entities.Roles.SUBADMIN).stream()
                .filter(u -> u.getAssignedOrganizationIds() != null
                        && u.getAssignedOrganizationIds().contains(organizationId))
                .forEach(u -> notificationService.createNotificationWithDedup(u.getId(), title, message, type, link,
                        u.getId() + ":" + dedupKey));
    }
}
