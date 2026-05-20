package com.dppsmart.dppsmart.Orders.Entities;

public enum OrderItemStatus {
    PENDING,
    AVAILABLE,
    AVAILABLE_IN_STOCK,
    PARTIAL,
    OUT_OF_STOCK,
    NEEDS_PRODUCTION,
    TO_PRODUCE,
    RESERVED,
    WAITING_MATERIALS,
    IN_PRODUCTION,
    PRODUCED,
    READY_FOR_DELIVERY,
    DELIVERED
}
