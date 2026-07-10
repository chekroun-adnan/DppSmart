package com.dppsmart.dppsmart.Production.Services;

import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Production.DTO.DailyOperationDto;
import com.dppsmart.dppsmart.Production.Entities.ProductionProgressLog;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionProgressLogRepository;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DailyOperationPlanningService {

    @Autowired private ProductionStepEntityRepository stepEntityRepository;
    @Autowired private OrdersRepository ordersRepository;
    @Autowired private PermissionService permissionService;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductionProgressLogRepository progressLogRepository;

    public List<DailyOperationDto> getDailyOperations(
            LocalDate date,
            String department,
            String employeeId,
            String statusFilter) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) {
            return List.of();
        }

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = targetDate.atTime(LocalTime.MIN);
        LocalDateTime dayEnd = targetDate.atTime(LocalTime.MAX);

        List<Orders> accessibleOrders = ordersRepository.findAll().stream()
                .filter(o -> user.getRole() == Roles.ADMIN
                        || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .collect(Collectors.toList());
        Set<String> accessibleOrderIds = accessibleOrders.stream()
                .map(Orders::getId).collect(Collectors.toSet());
        Map<String, Orders> orderMap = accessibleOrders.stream()
                .collect(Collectors.toMap(Orders::getId, o -> o));

        List<ProductionStepEntity> allSteps = stepEntityRepository.findAll().stream()
                .filter(s -> accessibleOrderIds.contains(s.getOrderId()))
                .filter(s -> s.getPlannedStartTime() != null || s.getPlannedEndTime() != null)
                .collect(Collectors.toList());

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        List<DailyOperationDto> results = new ArrayList<>();

        for (ProductionStepEntity step : allSteps) {
            LocalDateTime ps = step.getPlannedStartTime();
            LocalDateTime pe = step.getPlannedEndTime();

            boolean overlapsDate = overlapsDay(ps, pe, dayStart, dayEnd);
            if (!overlapsDate) continue;

            if (department != null && !department.isBlank()
                    && !department.equalsIgnoreCase(step.getResponsibleDepartment())) continue;

            if (statusFilter != null && !statusFilter.isBlank()) {
                try {
                    ProductionStepStatus filterStatus = ProductionStepStatus.valueOf(statusFilter.toUpperCase());
                    if (step.getStatus() != filterStatus) continue;
                } catch (IllegalArgumentException e) {
                }
            }

            if (step.getStatus() == ProductionStepStatus.IN_PROGRESS
                    && step.getRemainingQuantity() != null
                    && step.getRemainingQuantity() > 0) {
                List<ProductionProgressLog> todayLogs = progressLogRepository
                        .findByStepIdAndTimestampBetweenOrderByTimestampDesc(
                                step.getId(), targetDate.atStartOfDay(), targetDate.atTime(LocalTime.MAX));
                boolean hasProgressToday = todayLogs.stream()
                        .anyMatch(log -> "PROGRESS".equals(log.getAction()));
                if (hasProgressToday) {
                    continue;
                }
            }

            Orders order = orderMap.get(step.getOrderId());
            DailyOperationDto dto = toDto(step, order, now);
            results.add(dto);
        }

        results.sort((a, b) -> {
            if (a.isCarriedForward() != b.isCarriedForward()) {
                return a.isCarriedForward() ? -1 : 1;
            }
            if (a.isOverdue() != b.isOverdue()) {
                return a.isOverdue() ? -1 : 1;
            }
            int pc = Integer.compare(b.getPriorityScore(), a.getPriorityScore());
            if (pc != 0) return pc;
            if (a.getPlannedStartDateTime() != null && b.getPlannedStartDateTime() != null) {
                return a.getPlannedStartDateTime().compareTo(b.getPlannedStartDateTime());
            }
            return 0;
        });

        return results;
    }

    private boolean overlapsDay(LocalDateTime start, LocalDateTime end, LocalDateTime dayStart, LocalDateTime dayEnd) {
        if (start == null && end == null) return false;
        if (start == null) return !end.isBefore(dayStart) && !end.isAfter(dayEnd);
        if (end == null) return !start.isBefore(dayStart) && !start.isAfter(dayEnd);
        return !start.isAfter(dayEnd) && !end.isBefore(dayStart);
    }

    public Map<String, Long> getDepartmentCounts(LocalDate date, String department) {
        List<DailyOperationDto> ops = getDailyOperations(date, department, null, null);
        return ops.stream()
                .filter(d -> d.getDepartment() != null)
                .collect(Collectors.groupingBy(
                        DailyOperationDto::getDepartment,
                        Collectors.counting()));
    }

    private DailyOperationDto toDto(ProductionStepEntity step, Orders order, LocalDateTime now) {
        DailyOperationDto dto = new DailyOperationDto();
        dto.setOperationId(step.getId());
        dto.setOrderId(step.getOrderId());
        dto.setOrderReference(order != null ? order.getOrderReference() : null);
        dto.setProductName(step.getProductName());
        dto.setOperationName(step.getOperationName());
        dto.setDepartment(step.getResponsibleDepartment());
        dto.setQuantity(step.getOrderQuantity());
        dto.setPlannedStartDateTime(step.getPlannedStartTime());
        dto.setPlannedEndDateTime(step.getPlannedEndTime());

        double durationInMinutes = "HOURS".equalsIgnoreCase(step.getDurationUnit())
                ? (step.getTotalDuration() != null ? step.getTotalDuration() * 60 : 0)
                : (step.getTotalDuration() != null ? step.getTotalDuration() : 0);
        dto.setDurationFormatted(formatDuration(durationInMinutes));

        dto.setStatus(step.getStatus());
        dto.setAssignedEmployee(step.getCompletedBy());
        dto.setSequenceOrder(step.getSequenceOrder());

        dto.setRequiredQuantity(step.getRequiredQuantity() != null ? step.getRequiredQuantity() : step.getOrderQuantity());
        dto.setCompletedQuantity(step.getCompletedQuantity() != null ? step.getCompletedQuantity() : 0);
        dto.setRemainingQuantity(step.getRemainingQuantity() != null ? step.getRemainingQuantity() : (step.getOrderQuantity() != null ? step.getOrderQuantity() : 0));
        dto.setCompletionPercentage(step.getCompletionPercentage() != null ? step.getCompletionPercentage() : 0.0);

        dto.setCarriedForward(
                step.getStatus() == ProductionStepStatus.IN_PROGRESS
                && step.getRemainingQuantity() != null
                && step.getRemainingQuantity() > 0
                && step.getPlannedStartTime() != null
                && step.getPlannedStartTime().toLocalDate().isBefore(now.toLocalDate())
        );

        dto.setHealthScore(step.getHealthScore());
        dto.setDelayStatus(step.getDelayStatus());
        dto.setDelayMinutes(step.getDelayMinutes());
        dto.setActualDuration(step.getActualDuration());
        dto.setPlannedDuration(step.getTotalDuration());

        boolean isOverdue = false;
        if (step.getStatus() == ProductionStepStatus.PLANNED
                || step.getStatus() == ProductionStepStatus.WAITING
                || step.getStatus() == ProductionStepStatus.READY
                || step.getStatus() == ProductionStepStatus.PENDING) {
            isOverdue = step.getPlannedStartTime() != null
                    && now.isAfter(step.getPlannedStartTime());
        } else if (step.getStatus() == ProductionStepStatus.IN_PROGRESS) {
            isOverdue = step.getPlannedEndTime() != null
                    && now.isAfter(step.getPlannedEndTime());
        }
        dto.setOverdue(isOverdue);

        dto.setPriorityScore(computePriorityScore(isOverdue, order, step, now));

        if (order != null && order.getRequestedDeliveryDate() != null) {
            long daysUntilDelivery = ChronoUnit.DAYS.between(now.toLocalDate(), order.getRequestedDeliveryDate());
            if (daysUntilDelivery < 0) {
                dto.setDeliveryDateLabel("Overdue by " + (-daysUntilDelivery) + "d");
            } else if (daysUntilDelivery == 0) {
                dto.setDeliveryDateLabel("Due today");
            } else {
                dto.setDeliveryDateLabel("Due in " + daysUntilDelivery + "d");
            }
            dto.setClientName(order.getClientId());
        }

        return dto;
    }

    private int computePriorityScore(boolean isOverdue, Orders order, ProductionStepEntity step, LocalDateTime now) {
        if (isOverdue) return 1000;

        int score = 0;

        if (order != null && order.getRequestedDeliveryDate() != null) {
            long daysUntilDelivery = ChronoUnit.DAYS.between(now.toLocalDate(), order.getRequestedDeliveryDate());
            if (daysUntilDelivery < 0) {
                score += 500;
            } else if (daysUntilDelivery <= 1) {
                score += 400;
            } else if (daysUntilDelivery <= 3) {
                score += 300;
            } else if (daysUntilDelivery <= 7) {
                score += 200;
            } else {
                score += 100;
            }
        }

        if (order != null && order.getOrderPriority() != null) {
            switch (order.getOrderPriority()) {
                case HIGH: score += 300; break;
                case NORMAL: score += 200; break;
                case LOW: score += 100; break;
            }
        }

        if (step.getPlannedEndTime() != null) {
            long hoursUntilEnd = ChronoUnit.HOURS.between(now, step.getPlannedEndTime());
            if (hoursUntilEnd < 0) {
                score += 200;
            } else if (hoursUntilEnd <= 2) {
                score += 100;
            }
        }

        return score;
    }

    static String formatDuration(double minutes) {
        if (minutes <= 0) return "0 min";
        if (minutes < 60) return Math.round(minutes) + " min";
        long h = (long) Math.floor(minutes / 60);
        long m = Math.round(minutes % 60);
        return m > 0 ? h + "h " + m + "m" : h + "h";
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
