package com.dppsmart.dppsmart.Production.Services;

import com.dppsmart.dppsmart.Orders.Entities.OrderPriority;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProductionSchedulingService {

    private static final LocalTime FACTORY_START_TIME = LocalTime.of(8, 0);
    private static final LocalTime FACTORY_END_TIME = LocalTime.of(17, 0);
    private static final long WORKING_MINUTES_PER_DAY =
            ChronoUnit.MINUTES.between(FACTORY_START_TIME, FACTORY_END_TIME);

    public static final String ON_SCHEDULE = "ON_SCHEDULE";
    public static final String AT_RISK = "AT_RISK";
    public static final String DELAYED = "DELAYED";

    @Data
    @AllArgsConstructor
    public static class ScheduledOrder {
        private String orderId;
        private LocalDateTime plannedStartDateTime;
        private LocalDateTime plannedEndDateTime;
        private LocalDateTime forecastEndDateTime;
        private String delayStatus;
        private Double delayMinutes;
    }


    public int computePriorityScore(Orders order, List<ProductionStepEntity> steps) {
        if (order == null) return 0;
        int score = 0;

        if (order.getRequestedDeliveryDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), order.getRequestedDeliveryDate());
            if (days < 0) score += 300;
            else if (days <= 1) score += 250;
            else if (days <= 3) score += 200;
            else if (days <= 7) score += 150;
            else score += 50;
        }

        if (steps != null) {
            boolean hasDelayed = steps.stream().anyMatch(s -> DELAYED.equals(s.getDelayStatus()));
            boolean hasAtRisk = steps.stream().anyMatch(s -> AT_RISK.equals(s.getDelayStatus()));
            if (hasDelayed) score += 250;
            else if (hasAtRisk) score += 150;
        }

        if (order.getOrderPriority() != null) {
            switch (order.getOrderPriority()) {
                case HIGH: score += 200; break;
                case NORMAL: score += 100; break;
                case LOW: score += 0; break;
            }
        }

        score += 150;

        if (steps != null && !steps.isEmpty()) {
            long sequentialSteps = steps.stream().filter(s -> !Boolean.TRUE.equals(s.getCanRunInParallel())).count();
            if (sequentialSteps > 10) score += 100;
            else if (sequentialSteps > 5) score += 50;
            else score += 20;
        }

        return score;
    }

    public String getPriorityLevel(int score) {
        if (score >= 700) return "CRITICAL";
        if (score >= 500) return "HIGH";
        if (score >= 300) return "NORMAL";
        return "LOW";
    }

    public String computeDelayStatus(LocalDateTime plannedEnd, LocalDateTime forecastEnd) {
        if (plannedEnd == null || forecastEnd == null) return ON_SCHEDULE;
        if (!forecastEnd.isAfter(plannedEnd)) return ON_SCHEDULE;

        long plannedMinutes = Math.max(1, ChronoUnit.MINUTES.between(forecastEnd, plannedEnd));
        long delayMinutes = ChronoUnit.MINUTES.between(plannedEnd, forecastEnd);
        double delayPercent = (double) delayMinutes / plannedMinutes * 100;

        if (delayPercent <= 10) return AT_RISK;
        return DELAYED;
    }

    public double computeDelayMinutes(LocalDateTime plannedEnd, LocalDateTime forecastEnd) {
        if (plannedEnd == null || forecastEnd == null) return 0;
        return Math.max(0, ChronoUnit.MINUTES.between(plannedEnd, forecastEnd));
    }

    public int computeStepHealthScore(ProductionStepEntity step, LocalDateTime now) {
        if (step == null) return 100;
        int score = 100;

        if (DELAYED.equals(step.getDelayStatus())) score -= 40;
        else if (AT_RISK.equals(step.getDelayStatus())) score -= 15;

        if (step.getStatus() == ProductionStepStatus.BLOCKED) score -= 30;

        if (step.getPlannedEndTime() != null && now.isAfter(step.getPlannedEndTime())
                && step.getStatus() != ProductionStepStatus.COMPLETED
                && step.getStatus() != ProductionStepStatus.SKIPPED) {
            long overdueMinutes = ChronoUnit.MINUTES.between(step.getPlannedEndTime(), now);
            score -= Math.min(25, (int) (overdueMinutes / 30));
        }

        return Math.max(0, Math.min(100, score));
    }

    public int computeOrderHealthScore(List<ProductionStepEntity> steps) {
        if (steps == null || steps.isEmpty()) return 100;
        return (int) steps.stream()
                .filter(s -> s.getHealthScore() != null)
                .mapToInt(ProductionStepEntity::getHealthScore)
                .average()
                .orElse(100);
    }


    public void computeForecast(ProductionStepEntity step, LocalDateTime now) {
        if (step == null) return;

        LocalDateTime forecastEnd;

        if (step.getStatus() == ProductionStepStatus.COMPLETED
                || step.getStatus() == ProductionStepStatus.SKIPPED) {
            forecastEnd = step.getCompletedAt() != null ? step.getCompletedAt() : step.getPlannedEndTime();
            step.setForecastEndTime(forecastEnd);
            step.setForecastStartTime(step.getStartedAt() != null ? step.getStartedAt() : step.getPlannedStartTime());
        } else if (step.getStatus() == ProductionStepStatus.IN_PROGRESS) {
            Integer remainingQty = step.getRemainingQuantity();
            Integer completedQty = step.getCompletedQuantity();
            Double durationPerUnit = step.getDurationPerUnit();

            if (step.getStartedAt() != null && remainingQty != null && remainingQty > 0
                    && durationPerUnit != null && durationPerUnit > 0) {
                double remainingMinutes = remainingQty * durationPerUnit;
                if ("HOURS".equalsIgnoreCase(step.getDurationUnit())) {
                    remainingMinutes *= 60;
                }
                int remainingMinsInt = (int) Math.ceil(remainingMinutes);
                step.setRemainingDurationMinutes(remainingMinsInt);
                forecastEnd = now.plusMinutes(remainingMinsInt);
                step.setForecastStartTime(step.getStartedAt());
            } else if (step.getStartedAt() != null && step.getTotalDuration() != null) {
                double durationInMinutes = "HOURS".equalsIgnoreCase(step.getDurationUnit())
                        ? step.getTotalDuration() * 60 : step.getTotalDuration();
                long totalMins = Math.round(durationInMinutes);
                long elapsedMins = ChronoUnit.MINUTES.between(step.getStartedAt(), now);
                long remainingMins = Math.max(0, totalMins - elapsedMins);
                step.setRemainingDurationMinutes((int) remainingMins);
                forecastEnd = now.plusMinutes(remainingMins);
                step.setForecastStartTime(step.getStartedAt());
            } else {
                forecastEnd = step.getPlannedEndTime() != null ? step.getPlannedEndTime() : now;
            }
        } else if (step.getStatus() == ProductionStepStatus.BLOCKED) {
            forecastEnd = step.getPlannedEndTime() != null
                    ? step.getPlannedEndTime().plusDays(1) : now.plusDays(1);
        } else {
            forecastEnd = step.getPlannedEndTime() != null ? step.getPlannedEndTime() : now;
        }

        step.setForecastEndTime(forecastEnd);
        if (step.getForecastStartTime() == null) {
            step.setForecastStartTime(step.getPlannedStartTime() != null ? step.getPlannedStartTime() : now);
        }

        step.setDelayMinutes(computeDelayMinutes(step.getPlannedEndTime(), step.getForecastEndTime()));
        step.setDelayStatus(computeDelayStatus(step.getPlannedEndTime(), step.getForecastEndTime()));

        if (step.getStartedAt() != null && step.getCompletedAt() != null) {
            step.setActualDuration((double) ChronoUnit.MINUTES.between(step.getStartedAt(), step.getCompletedAt()));
        }

        step.setHealthScore(computeStepHealthScore(step, now));
    }

    public void computeForecasts(List<ProductionStepEntity> steps) {
        if (steps == null) return;
        LocalDateTime now = LocalDateTime.now();
        for (ProductionStepEntity step : steps) {
            computeForecast(step, now);
        }
    }

    public void computeOrderForecast(List<ProductionStepEntity> steps, Orders order) {
        if (steps == null || steps.isEmpty() || order == null) return;
        computeForecasts(steps);

        LocalDateTime forecastEnd = steps.stream()
                .filter(s -> s.getForecastEndTime() != null)
                .map(ProductionStepEntity::getForecastEndTime)
                .max(LocalDateTime::compareTo)
                .orElse(order.getPlannedEndDateTime() != null ? order.getPlannedEndDateTime() : LocalDateTime.now());

        order.setForecastEndDateTime(forecastEnd);
    }


    public List<ScheduledOrder> computeQueueSchedule(
            List<Orders> orders,
            Map<String, List<ProductionStepEntity>> stepsByOrderId) {
        List<Orders> sorted = sortByPriority(orders);
        List<ScheduledOrder> result = new ArrayList<>();
        LocalDateTime now = getFactoryStartTime();
        LocalDateTime cursor = now;

        for (Orders order : sorted) {
            List<ProductionStepEntity> steps = stepsByOrderId.getOrDefault(order.getId(), List.of());
            if (steps.isEmpty()) {
                result.add(new ScheduledOrder(order.getId(), cursor, cursor, cursor, ON_SCHEDULE, 0.0));
                continue;
            }

            if (cursor.isBefore(now)) cursor = now;

            alignStepsToWindow(steps, cursor);
            LocalDateTime orderEnd = steps.stream()
                    .filter(s -> s.getPlannedEndTime() != null)
                    .map(ProductionStepEntity::getPlannedEndTime)
                    .max(LocalDateTime::compareTo)
                    .orElse(cursor);

            computeForecasts(steps);
            LocalDateTime forecastEnd = steps.stream()
                    .filter(s -> s.getForecastEndTime() != null)
                    .map(ProductionStepEntity::getForecastEndTime)
                    .max(LocalDateTime::compareTo)
                    .orElse(orderEnd);

            String delaySt = computeDelayStatus(orderEnd, forecastEnd);
            double delayMin = computeDelayMinutes(orderEnd, forecastEnd);

            result.add(new ScheduledOrder(order.getId(), cursor, orderEnd, forecastEnd, delaySt, delayMin));
            cursor = nextWorkingTime(orderEnd);
        }

        return result;
    }

    public LocalDateTime scheduleNewOrderSteps(
            List<ProductionStepEntity> steps,
            Map<String, List<ProductionStepEntity>> existingStepsByOrderId,
            List<Orders> allOrders) {
        LocalDateTime now = getFactoryStartTime();
        List<Orders> sorted = sortByPriority(allOrders);
        LocalDateTime cursor = now;

        for (Orders order : sorted) {
            String oid = order.getId();
            List<ProductionStepEntity> existingSteps = existingStepsByOrderId.getOrDefault(oid, List.of());
            if (existingSteps.isEmpty()) {
                continue;
            }

            if (cursor.isBefore(now)) cursor = now;
            alignStepsToWindow(existingSteps, cursor);

            if (oid.equals(steps.isEmpty() ? null : steps.get(0).getOrderId())) continue;

            LocalDateTime orderEnd = existingSteps.stream()
                    .filter(s -> s.getPlannedEndTime() != null)
                    .map(ProductionStepEntity::getPlannedEndTime)
                    .max(LocalDateTime::compareTo)
                    .orElse(cursor);
            cursor = nextWorkingTime(orderEnd);
        }

        if (cursor.isBefore(now)) cursor = now;
        alignStepsToWindow(steps, cursor);
        computeForecasts(steps);
        return cursor;
    }

    public void alignStepsToWindow(List<ProductionStepEntity> steps, LocalDateTime orderStart) {
        LocalDateTime cursor = orderStart;
        for (ProductionStepEntity step : steps) {
            if (step.getStatus() != ProductionStepStatus.PLANNED
                    && step.getStatus() != ProductionStepStatus.READY
                    && step.getStatus() != ProductionStepStatus.PENDING
                    && step.getStatus() != ProductionStepStatus.WAITING) continue;

            double durationInMinutes = "HOURS".equalsIgnoreCase(step.getDurationUnit())
                    ? step.getTotalDuration() * 60
                    : step.getTotalDuration();
            long mins = Math.round(durationInMinutes);

            if (Boolean.TRUE.equals(step.getCanRunInParallel())) {
                step.setPlannedStartTime(orderStart);
                step.setPlannedEndTime(orderStart.plusMinutes(mins));
            } else {
                step.setPlannedStartTime(cursor);
                step.setPlannedEndTime(cursor.plusMinutes(mins));
                cursor = step.getPlannedEndTime();
            }
        }
    }


    public List<Orders> sortByPriority(List<Orders> orders) {
        return orders.stream()
                .sorted((a, b) -> {
                    boolean aDelayed = DELAYED.equals(a.getDelayStatus());
                    boolean bDelayed = DELAYED.equals(b.getDelayStatus());
                    if (aDelayed != bDelayed) return aDelayed ? -1 : 1;

                    boolean aAtRisk = AT_RISK.equals(a.getDelayStatus());
                    boolean bAtRisk = AT_RISK.equals(b.getDelayStatus());
                    if (aAtRisk != bAtRisk) return aAtRisk ? -1 : 1;

                    LocalDate da = a.getRequestedDeliveryDate();
                    LocalDate db = b.getRequestedDeliveryDate();
                    if (da != null && db != null) {
                        int cmp = da.compareTo(db);
                        if (cmp != 0) return cmp;
                    } else if (da == null && db != null) return 1;
                    else if (da != null) return -1;

                    int pa = a.getPriorityScore() != null ? a.getPriorityScore() : 0;
                    int pb = b.getPriorityScore() != null ? b.getPriorityScore() : 0;
                    int cmp = Integer.compare(pb, pa);
                    if (cmp != 0) return cmp;

                    cmp = Integer.compare(
                            priorityScore(b.getOrderPriority()),
                            priorityScore(a.getOrderPriority()));
                    if (cmp != 0) return cmp;

                    LocalDateTime ca = a.getCreatedAt();
                    LocalDateTime cb = b.getCreatedAt();
                    if (ca == null && cb == null) return 0;
                    if (ca == null) return 1;
                    if (cb == null) return -1;
                    return ca.compareTo(cb);
                })
                .collect(Collectors.toList());
    }


    @Data
    @AllArgsConstructor
    public static class DepartmentCapacity {
        private String department;
        private double availableHours;
        private double assignedHours;
        private double utilizationPercent;
        private String status;
    }

    public List<DepartmentCapacity> computeDepartmentCapacities(
            List<ProductionStepEntity> steps,
            LocalDate date) {
        Map<String, List<ProductionStepEntity>> byDept = steps.stream()
                .filter(s -> s.getResponsibleDepartment() != null)
                .collect(Collectors.groupingBy(ProductionStepEntity::getResponsibleDepartment));

        List<DepartmentCapacity> capacities = new ArrayList<>();
        for (Map.Entry<String, List<ProductionStepEntity>> entry : byDept.entrySet()) {
            String dept = entry.getKey();
            List<ProductionStepEntity> deptSteps = entry.getValue();

            double assignedMinutes = deptSteps.stream()
                    .filter(s -> s.getPlannedStartTime() != null && s.getPlannedEndTime() != null)
                    .filter(s -> {
                        if (date == null) return true;
                        return s.getPlannedStartTime().toLocalDate().equals(date)
                                || s.getPlannedEndTime().toLocalDate().equals(date);
                    })
                    .mapToDouble(s -> Math.abs(ChronoUnit.MINUTES.between(
                            s.getPlannedStartTime(), s.getPlannedEndTime())))
                    .sum();

            double assignedHours = assignedMinutes / 60.0;
            double availableHours = 8.0;
            double utilizationPercent = availableHours > 0
                    ? Math.round(assignedHours / availableHours * 100) : 0;

            String capStatus;
            if (utilizationPercent > 100) capStatus = "OVERLOADED";
            else if (utilizationPercent < 50) capStatus = "UNDERUTILIZED";
            else capStatus = "NORMAL";

            capacities.add(new DepartmentCapacity(dept, availableHours, assignedHours, utilizationPercent, capStatus));
        }
        return capacities;
    }


    public LocalDateTime getFactoryStartTime() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.toLocalDate().atTime(FACTORY_START_TIME);
        if (now.isAfter(start)) {
            start = now;
        }
        return start;
    }

    public LocalDateTime nextWorkingTime(LocalDateTime time) {
        if (time == null) return getFactoryStartTime();

        LocalTime t = time.toLocalTime();
        LocalDate d = time.toLocalDate();

        if (t.isAfter(FACTORY_END_TIME) || t.equals(FACTORY_END_TIME)) {
            d = d.plusDays(1);
            t = FACTORY_START_TIME;
        }

        if (t.isBefore(FACTORY_START_TIME)) {
            t = FACTORY_START_TIME;
        }

        while (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            d = d.plusDays(1);
            t = FACTORY_START_TIME;
        }

        return LocalDateTime.of(d, t);
    }

    private int priorityScore(OrderPriority p) {
        if (p == null) return 1;
        switch (p) {
            case HIGH: return 3;
            case NORMAL: return 2;
            case LOW: return 1;
            default: return 1;
        }
    }
}
