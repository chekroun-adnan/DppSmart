package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.Orders.Entities.OrderPriority;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class OrderPriorityService {

    public String computeProductionBadge(Orders order) {
        LocalDate date = getDeliveryDate(order);
        if (date == null) return "LOW";

        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), date);

        if (daysUntil < 0) return "LATE";
        if (daysUntil <= 1) return "HIGH";
        if (daysUntil <= 7) return "MEDIUM";
        return "LOW";
    }

    public String computeProductionBadge(Orders order, LocalDate now) {
        LocalDate date = getDeliveryDate(order);
        if (date == null) return "LOW";

        long daysUntil = ChronoUnit.DAYS.between(now, date);

        if (daysUntil < 0) return "LATE";
        if (daysUntil <= 1) return "HIGH";
        if (daysUntil <= 7) return "MEDIUM";
        return "LOW";
    }

    public long computePriorityScore(Orders order) {
        return computePriorityScore(order, LocalDate.now());
    }

    public long computePriorityScore(Orders order, LocalDate now) {
        LocalDate date = getDeliveryDate(order);

        long proximityScore;
        if (date == null) {
            proximityScore = 999_999L;
        } else {
            long daysUntil = ChronoUnit.DAYS.between(now, date);
            if (daysUntil < 0) {
                proximityScore = -1000L + daysUntil;
            } else {
                proximityScore = daysUntil;
            }
        }

        OrderPriority manualPrio = order.getOrderPriority() != null ? order.getOrderPriority() : OrderPriority.NORMAL;
        long manualScore = switch (manualPrio) {
            case HIGH -> 0;
            case NORMAL -> 100;
            case LOW -> 200;
        };

        long createdScore = order.getCreatedAt() != null
                ? order.getCreatedAt().toLocalDate().toEpochDay()
                : LocalDate.now().toEpochDay();

        return proximityScore * 100_000L + manualScore * 10_000L + createdScore;
    }

    public List<Orders> sortForProduction(List<Orders> orders) {
        return sortForProduction(orders, LocalDate.now());
    }

    public List<Orders> sortForProduction(List<Orders> orders, LocalDate now) {
        return orders.stream()
                .sorted(Comparator.comparingLong((Orders o) -> computePriorityScore(o, now))
                        .thenComparingLong(o -> o.getCreatedAt() != null
                                ? o.getCreatedAt().toLocalDate().toEpochDay()
                                : LocalDate.now().toEpochDay()))
                .toList();
    }

    public boolean isCloseDeliveryWithLowPriority(Orders order) {
        return isCloseDeliveryWithLowPriority(order, LocalDate.now());
    }

    public boolean isCloseDeliveryWithLowPriority(Orders order, LocalDate now) {
        LocalDate date = getDeliveryDate(order);
        if (date == null) return false;

        long daysUntil = ChronoUnit.DAYS.between(now, date);
        boolean isClose = daysUntil >= 0 && daysUntil <= 3;
        boolean isLowPriority = order.getOrderPriority() == OrderPriority.LOW;

        return isClose && isLowPriority;
    }

    public String describeUrgency(long daysUntil) {
        if (daysUntil < 0) return "Overdue by " + (-daysUntil) + " day" + (-daysUntil != 1 ? "s" : "");
        if (daysUntil == 0) return "Due today";
        if (daysUntil == 1) return "Due tomorrow";
        return "Due in " + daysUntil + " day" + (daysUntil != 1 ? "s" : "");
    }

    public LocalDate getDeliveryDate(Orders order) {
        if (order.getConfirmedDeliveryDate() != null) return order.getConfirmedDeliveryDate();
        if (order.getProposedDeliveryDate() != null) return order.getProposedDeliveryDate();
        return order.getRequestedDeliveryDate();
    }

    public long computePriorityScoreForDto(
            LocalDate requestedDeliveryDate,
            LocalDate confirmedDeliveryDate,
            LocalDate proposedDeliveryDate,
            OrderPriority orderPriority,
            LocalDateTime createdAt) {
        return computePriorityScoreForDto(
                requestedDeliveryDate, confirmedDeliveryDate, proposedDeliveryDate,
                orderPriority, createdAt, LocalDate.now());
    }

    public long computePriorityScoreForDto(
            LocalDate requestedDeliveryDate,
            LocalDate confirmedDeliveryDate,
            LocalDate proposedDeliveryDate,
            OrderPriority orderPriority,
            LocalDateTime createdAt,
            LocalDate now) {
        LocalDate date = confirmedDeliveryDate != null ? confirmedDeliveryDate
                : proposedDeliveryDate != null ? proposedDeliveryDate
                : requestedDeliveryDate;

        long proximityScore;
        if (date == null) {
            proximityScore = 999_999L;
        } else {
            long daysUntil = ChronoUnit.DAYS.between(now, date);
            if (daysUntil < 0) {
                proximityScore = -1000L + daysUntil;
            } else {
                proximityScore = daysUntil;
            }
        }

        OrderPriority manualPrio = orderPriority != null ? orderPriority : OrderPriority.NORMAL;
        long manualScore = switch (manualPrio) {
            case HIGH -> 0;
            case NORMAL -> 100;
            case LOW -> 200;
        };

        long createdScore = createdAt != null
                ? createdAt.toLocalDate().toEpochDay()
                : now.toEpochDay();

        return proximityScore * 100_000L + manualScore * 10_000L + createdScore;
    }

    public String computeProductionBadgeForDto(
            LocalDate requestedDeliveryDate,
            LocalDate confirmedDeliveryDate,
            LocalDate proposedDeliveryDate) {
        return computeProductionBadgeForDto(
                requestedDeliveryDate, confirmedDeliveryDate, proposedDeliveryDate, LocalDate.now());
    }

    public String computeProductionBadgeForDto(
            LocalDate requestedDeliveryDate,
            LocalDate confirmedDeliveryDate,
            LocalDate proposedDeliveryDate,
            LocalDate now) {
        LocalDate date = confirmedDeliveryDate != null ? confirmedDeliveryDate
                : proposedDeliveryDate != null ? proposedDeliveryDate
                : requestedDeliveryDate;

        if (date == null) return "LOW";

        long daysUntil = ChronoUnit.DAYS.between(now, date);

        if (daysUntil < 0) return "LATE";
        if (daysUntil <= 1) return "HIGH";
        if (daysUntil <= 7) return "MEDIUM";
        return "LOW";
    }
}
