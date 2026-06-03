package com.dppsmart.dppsmart.Notification.Services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeEventService {

    private final SimpMessagingTemplate messagingTemplate;

    public static final String ORDER_UPDATED               = "ORDER_UPDATED";
    public static final String ORDER_STATUS_CHANGED        = "ORDER_STATUS_CHANGED";
    public static final String PRODUCT_STOCK_UPDATED       = "PRODUCT_STOCK_UPDATED";
    public static final String MATERIAL_STOCK_UPDATED      = "MATERIAL_STOCK_UPDATED";
    public static final String STOCK_UPDATED               = "STOCK_UPDATED";
    public static final String PRODUCTION_STARTED          = "PRODUCTION_STARTED";
    public static final String PRODUCTION_COMPLETED        = "PRODUCTION_COMPLETED";
    public static final String SUPPLY_CHAIN_ORDER_CREATED  = "SUPPLY_CHAIN_ORDER_CREATED";
    public static final String SUPPLY_CHAIN_ORDER_RECEIVED = "SUPPLY_CHAIN_ORDER_RECEIVED";
    public static final String DELIVERY_COMPLETED          = "DELIVERY_COMPLETED";
    public static final String RESERVATION_UPDATED         = "RESERVATION_UPDATED";
    public static final String SIMULATION_RESULT           = "SIMULATION_RESULT";

    public void broadcastOrderUpdated(Object orderDto) {
        send("/topic/orders", event(ORDER_UPDATED, orderDto));
    }

    public void broadcastOrderStatusChanged(String orderId, String newStatus, Object orderDto) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("newStatus", newStatus);
        payload.put("order", orderDto);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/orders", event(ORDER_STATUS_CHANGED, payload));
        send("/topic/orders/" + orderId, event(ORDER_STATUS_CHANGED, payload));
    }

    public void broadcastProductStockUpdated(String productId, int newQty, String organizationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("productId", productId);
        payload.put("newQuantity", newQty);
        payload.put("organizationId", organizationId);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/stocks/products", event(PRODUCT_STOCK_UPDATED, payload));
        send("/topic/stocks/products", event(STOCK_UPDATED, payload));
    }

    public void broadcastMaterialStockUpdated(String materialId, int newQty, String organizationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("materialId", materialId);
        payload.put("newQuantity", newQty);
        payload.put("organizationId", organizationId);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/stocks/materials", event(MATERIAL_STOCK_UPDATED, payload));
        send("/topic/stocks/materials", event(STOCK_UPDATED, payload));
    }

    public void broadcastProductionStarted(String productionId, String orderId, String productId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("productionId", productionId);
        payload.put("orderId", orderId);
        payload.put("productId", productId);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/production", event(PRODUCTION_STARTED, payload));
        if (orderId != null) send("/topic/orders/" + orderId, event(PRODUCTION_STARTED, payload));
    }

    public void broadcastProductionCompleted(String productionId, String orderId, String productId, int quantity) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("productionId", productionId);
        payload.put("orderId", orderId);
        payload.put("productId", productId);
        payload.put("quantity", quantity);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/production", event(PRODUCTION_COMPLETED, payload));
        if (orderId != null) send("/topic/orders/" + orderId, event(PRODUCTION_COMPLETED, payload));
        send("/topic/stocks/products", event(PRODUCT_STOCK_UPDATED, payload));
    }

    public void broadcastSupplyChainOrderCreated(String supplyOrderId, String orderId, Object details) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("supplyChainOrderId", supplyOrderId);
        payload.put("relatedOrderId", orderId);
        payload.put("details", details);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/supply-chain", event(SUPPLY_CHAIN_ORDER_CREATED, payload));
    }

    public void broadcastSupplyChainOrderReceived(String supplyOrderId, Object details) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("supplyChainOrderId", supplyOrderId);
        payload.put("details", details);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/supply-chain", event(SUPPLY_CHAIN_ORDER_RECEIVED, payload));
        send("/topic/stocks/materials", event(MATERIAL_STOCK_UPDATED, payload));
    }

    public void broadcastDeliveryCompleted(String orderId, Object orderDto) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("order", orderDto);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/orders", event(DELIVERY_COMPLETED, payload));
        send("/topic/orders/" + orderId, event(DELIVERY_COMPLETED, payload));
    }

    public void broadcastReservationUpdated(String orderId, String status) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("reservationStatus", status);
        payload.put("timestamp", LocalDateTime.now().toString());

        send("/topic/reservations", event(RESERVATION_UPDATED, payload));
        if (orderId != null) send("/topic/orders/" + orderId, event(RESERVATION_UPDATED, payload));
    }

    public void broadcastSimulationResult(String orderId, Object simulationResult) {
        send("/topic/orders/" + orderId, event(SIMULATION_RESULT, simulationResult));
    }

    private Map<String, Object> event(String type, Object data) {
        Map<String, Object> wrapper = new HashMap<>();
        wrapper.put("type", type);
        wrapper.put("data", data);
        wrapper.put("timestamp", LocalDateTime.now().toString());
        return wrapper;
    }

    private void send(String destination, Object payload) {
        try {
            messagingTemplate.convertAndSend(destination, payload);
        } catch (Exception e) {
            log.warn("WebSocket broadcast failed for {}: {}", destination, e.getMessage());
        }
    }
}
