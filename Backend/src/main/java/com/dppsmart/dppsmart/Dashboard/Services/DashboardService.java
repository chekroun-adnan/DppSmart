package com.dppsmart.dppsmart.Dashboard.Services;

import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Dashboard.DTO.*;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Stock.Entities.Stock;
import com.dppsmart.dppsmart.Stock.Repositories.StockRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final ProductionRepository productionRepository;
    private final StockRepository stockRepository;
    private final OrdersRepository ordersRepository;
    private final EmployeesRepository employeesRepository;
    private final ScanEventRepository scanEventRepository;
    private final PermissionService permissionService;

    public DashboardResponseDto getMyDashboard(String selectedOrgId) {
        User user = getCurrentUser();

        DashboardResponseDto resp = new DashboardResponseDto();
        resp.setRole(user.getRole());
        resp.setUserEmail(user.getEmail());

        List<String> scopeOrgIds = resolveScopeOrganizationIds(user);
        List<String> effectiveOrgIds = resolveEffectiveOrganizationIds(user, scopeOrgIds, selectedOrgId);
        resp.setOrganizationScopeIds(scopeOrgIds);
        resp.setOrganizationScopes(buildOrganizationScopes(scopeOrgIds));

        DashboardKpisDto kpis = new DashboardKpisDto();

        if (permissionService.isAdmin(user)) {
            fillAdminKpis(kpis, effectiveOrgIds);
        } else {
            fillScopedKpis(kpis, effectiveOrgIds);
        }

        List<Product> products = getProductsForScope(effectiveOrgIds, permissionService.isAdmin(user));
        List<Production> productions = getProductionsForScope(effectiveOrgIds, permissionService.isAdmin(user));
        List<Orders> orders = getOrdersForScope(effectiveOrgIds, permissionService.isAdmin(user));
        List<Stock> stocks = getStocksForScope(effectiveOrgIds, permissionService.isAdmin(user));
        List<ScanEvent> scans = getScansForScope(effectiveOrgIds, permissionService.isAdmin(user));

        resp.setKpis(kpis);
        resp.setDppComplianceScore(calculateComplianceScore(products));
        resp.setBottleneck(buildBottleneck(productions));
        resp.setTopRiskProducts(buildTopRiskProducts(products, productions, scans));
        resp.setLiveActivity(buildLiveActivity(productions, orders, scans));
        resp.setTodayPriorities(buildTodayPriorities(kpis, resp.getDppComplianceScore()));
        resp.setExportMarketSnapshot(buildExportMarketSnapshot(orders));
        resp.setNotifications(buildNotifications(kpis, resp.getDppComplianceScore(), productions));

        return resp;
    }

    private void fillAdminKpis(DashboardKpisDto kpis, List<String> effectiveOrgIds) {
        kpis.setOrganizationsMain((long) organizationRepository.findByOrganizationType(OrganizationType.MAIN).size());
        kpis.setOrganizationsSub((long) organizationRepository.findByOrganizationType(OrganizationType.SUB).size());

        List<User> users = userRepository.findAll();
        UserCountsDto userCounts = new UserCountsDto();
        userCounts.setAdmins(users.stream().filter(u -> u.getRole() == Roles.ADMIN).count());
        userCounts.setSubAdmins(users.stream().filter(u -> u.getRole() == Roles.SUBADMIN).count());
        userCounts.setClients(users.stream().filter(u -> u.getRole() == Roles.CLIENT).count());
        userCounts.setTotal((long) users.size());
        kpis.setUserCounts(userCounts);

        if (effectiveOrgIds.isEmpty()) {
            kpis.setProducts(productRepository.count());
            kpis.setProductions(productionRepository.count());
            kpis.setOrders(ordersRepository.count());
            kpis.setEmployees(employeesRepository.count());
            kpis.setScans(scanEventRepository.count());
            kpis.setLowStockItems(countLowStock(stockRepository.findAll()));
            kpis.setProductionsByStatus(groupProductionsByStatus(productionRepository.findAll()));
            kpis.setOrdersByStatus(groupOrdersByStatus(ordersRepository.findAll().stream().map(Orders::getStatus).toList()));
            return;
        }

        fillScopedKpis(kpis, effectiveOrgIds);
    }

    private void fillScopedKpis(DashboardKpisDto kpis, List<String> scopeOrgIds) {
        if (scopeOrgIds.isEmpty()) {
            kpis.setProducts(0L);
            kpis.setProductions(0L);
            kpis.setOrders(0L);
            kpis.setEmployees(0L);
            kpis.setScans(0L);
            kpis.setLowStockItems(0L);
            kpis.setProductionsByStatus(Map.of());
            kpis.setOrdersByStatus(Map.of());
            return;
        }

        long products = 0;
        long productions = 0;
        long orders = 0;
        long employees = 0;
        long scans = 0;
        long lowStock = 0;

        Map<ProductionStatus, Long> prodByStatus = new EnumMap<>(ProductionStatus.class);
        Map<String, Long> ordersByStatus = new HashMap<>();

        for (String orgId : scopeOrgIds) {
            products += productRepository.findByOrganizationId(orgId).size();

            List<Production> prods = productionRepository.findByOrganizationId(orgId);
            productions += prods.size();
            mergeProductionStatusCounts(prodByStatus, groupProductionsByStatus(prods));

            var orgOrders = ordersRepository.findByOrganizationId(orgId);
            orders += orgOrders.size();
            mergeStringCounts(ordersByStatus, groupOrdersByStatus(orgOrders.stream().map(o -> o.getStatus()).toList()));

            employees += employeesRepository.findByOrganizationId(orgId).size();
            scans += scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(orgId).size();

            lowStock += countLowStock(stockRepository.findByOrganizationId(orgId));
        }

        kpis.setProducts(products);
        kpis.setProductions(productions);
        kpis.setOrders(orders);
        kpis.setEmployees(employees);
        kpis.setScans(scans);
        kpis.setLowStockItems(lowStock);
        kpis.setProductionsByStatus(prodByStatus);
        kpis.setOrdersByStatus(ordersByStatus);
    }

    private List<Product> getProductsForScope(List<String> scopeOrgIds, boolean isAdmin) {
        if (isAdmin && scopeOrgIds.isEmpty()) return productRepository.findAll();
        return scopeOrgIds.stream().flatMap(orgId -> productRepository.findByOrganizationId(orgId).stream()).toList();
    }

    private List<Production> getProductionsForScope(List<String> scopeOrgIds, boolean isAdmin) {
        if (isAdmin && scopeOrgIds.isEmpty()) return productionRepository.findAll();
        return scopeOrgIds.stream().flatMap(orgId -> productionRepository.findByOrganizationId(orgId).stream()).toList();
    }

    private List<Orders> getOrdersForScope(List<String> scopeOrgIds, boolean isAdmin) {
        if (isAdmin && scopeOrgIds.isEmpty()) return ordersRepository.findAll();
        return scopeOrgIds.stream().flatMap(orgId -> ordersRepository.findByOrganizationId(orgId).stream()).toList();
    }

    private List<Stock> getStocksForScope(List<String> scopeOrgIds, boolean isAdmin) {
        if (isAdmin && scopeOrgIds.isEmpty()) return stockRepository.findAll();
        return scopeOrgIds.stream().flatMap(orgId -> stockRepository.findByOrganizationId(orgId).stream()).toList();
    }

    private List<ScanEvent> getScansForScope(List<String> scopeOrgIds, boolean isAdmin) {
        if (isAdmin && scopeOrgIds.isEmpty()) return scanEventRepository.findAll();
        return scopeOrgIds.stream().flatMap(orgId -> scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(orgId).stream()).toList();
    }

    private Integer calculateComplianceScore(List<Product> products) {
        if (products.isEmpty()) return 0;
        double total = 0;
        for (Product product : products) {
            int fields = 0;
            int score = 0;
            fields++; if (hasText(product.getCompanyName())) score++;
            fields++; if (hasText(product.getSku())) score++;
            fields++; if (hasText(product.getQrUrl())) score++;
            fields++; if (hasText(product.getDppUrl())) score++;
            fields++; if (product.getMaterialsComposition() != null && !product.getMaterialsComposition().isEmpty()) score++;
            total += ((double) score / fields) * 100;
        }
        return (int) Math.round(total / products.size());
    }

    private BottleneckDto buildBottleneck(List<Production> productions) {
        BottleneckDto dto = new BottleneckDto();
        if (productions.isEmpty()) {
            dto.setStage("N/A");
            dto.setDelayedCount(0L);
            dto.setNote("No active production records.");
            return dto;
        }
        Map<ProductionStatus, Long> grouped = groupProductionsByStatus(productions);
        Map.Entry<ProductionStatus, Long> top = grouped.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        dto.setStage(top != null ? top.getKey().name() : "N/A");
        dto.setDelayedCount(top != null ? top.getValue() : 0L);
        dto.setNote("Highest workload concentration based on production statuses.");
        return dto;
    }

    private List<RiskProductDto> buildTopRiskProducts(List<Product> products, List<Production> productions, List<ScanEvent> scans) {
        Map<String, Long> scansByProduct = scans.stream()
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));
        Map<String, Long> activeProdByProduct = productions.stream()
                .filter(p -> p.getProductId() != null)
                .filter(p -> p.getStatus() != ProductionStatus.COMPLETED && p.getStatus() != ProductionStatus.CANCELLED)
                .collect(Collectors.groupingBy(Production::getProductId, Collectors.counting()));

        List<RiskProductDto> risks = new ArrayList<>();
        for (Product product : products) {
            long score = 0;
            List<String> reasons = new ArrayList<>();
            if (!hasText(product.getEndOfLifeInstructions())) {
                score += 35;
                reasons.add("Missing end-of-life instructions");
            }
            if (!hasText(product.getDppUrl()) || !hasText(product.getQrUrl())) {
                score += 30;
                reasons.add("Incomplete DPP or QR traceability");
            }
            if (scansByProduct.getOrDefault(product.getId(), 0L) == 0) {
                score += 20;
                reasons.add("No recent scan activity");
            }
            if (activeProdByProduct.getOrDefault(product.getId(), 0L) > 0) {
                score += 15;
                reasons.add("Pending production status");
            }
            if (score == 0) continue;
            RiskProductDto dto = new RiskProductDto();
            dto.setProductId(product.getId());
            dto.setProductName(product.getProductName());
            dto.setRiskScore(score);
            dto.setReasons(reasons);
            risks.add(dto);
        }
        return risks.stream()
                .sorted(Comparator.comparing(RiskProductDto::getRiskScore).reversed())
                .limit(5)
                .toList();
    }

    private List<ActivityItemDto> buildLiveActivity(List<Production> productions, List<Orders> orders, List<ScanEvent> scans) {
        List<ActivityItemDto> activity = new ArrayList<>();
        productions.stream()
                .sorted(Comparator.comparing(Production::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(5)
                .forEach(production -> {
                    ActivityItemDto item = new ActivityItemDto();
                    item.setType("PRODUCTION");
                    item.setTitle("Production update");
                    item.setDescription("Production " + production.getId() + " is " + (production.getStatus() != null ? production.getStatus().name() : "UNKNOWN"));
                    item.setTimestamp(production.getUpdatedAt() != null ? production.getUpdatedAt() : production.getCreatedAt());
                    activity.add(item);
                });
        orders.stream()
                .sorted(Comparator.comparing(Orders::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(5)
                .forEach(order -> {
                    ActivityItemDto item = new ActivityItemDto();
                    item.setType("ORDER");
                    item.setTitle("Order status");
                    item.setDescription("Order " + order.getOrderReference() + " status: " + order.getStatus());
                    item.setTimestamp(order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt());
                    activity.add(item);
                });
        scans.stream()
                .sorted(Comparator.comparing(ScanEvent::getScannedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(5)
                .forEach(scan -> {
                    ActivityItemDto item = new ActivityItemDto();
                    item.setType("SCAN");
                    item.setTitle("Product scan");
                    item.setDescription("Scanned product " + scan.getProductId() + " from " + (scan.getLocationText() != null ? scan.getLocationText() : "unknown location"));
                    item.setTimestamp(scan.getScannedAt());
                    activity.add(item);
                });

        return activity.stream()
                .sorted(Comparator.comparing(ActivityItemDto::getTimestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(10)
                .toList();
    }

    private List<PriorityItemDto> buildTodayPriorities(DashboardKpisDto kpis, Integer complianceScore) {
        List<PriorityItemDto> priorities = new ArrayList<>();
        if ((kpis.getLowStockItems() != null ? kpis.getLowStockItems() : 0) > 0) {
            PriorityItemDto p = new PriorityItemDto();
            p.setTitle("Replenish low stock materials");
            p.setSeverity("HIGH");
            p.setAction("Review stock module and create restock orders.");
            priorities.add(p);
        }
        if ((kpis.getOrders() != null ? kpis.getOrders() : 0) > 0) {
            PriorityItemDto p = new PriorityItemDto();
            p.setTitle("Review active order pipeline");
            p.setSeverity("MEDIUM");
            p.setAction("Confirm production alignment with pending orders.");
            priorities.add(p);
        }
        if ((complianceScore != null ? complianceScore : 0) < 80) {
            PriorityItemDto p = new PriorityItemDto();
            p.setTitle("Increase DPP completeness");
            p.setSeverity("HIGH");
            p.setAction("Complete missing QR, certification, and DPP fields.");
            priorities.add(p);
        }
        if (priorities.isEmpty()) {
            PriorityItemDto p = new PriorityItemDto();
            p.setTitle("Maintain operational performance");
            p.setSeverity("LOW");
            p.setAction("Monitor scans and production flow for stability.");
            priorities.add(p);
        }
        return priorities;
    }

    private List<ExportMarketItemDto> buildExportMarketSnapshot(List<Orders> orders) {
        return orders.stream()
                .collect(Collectors.groupingBy(
                        order -> hasText(order.getOrganizationId()) ? order.getOrganizationId() : "UNASSIGNED",
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    ExportMarketItemDto item = new ExportMarketItemDto();
                    item.setMarket("Org " + entry.getKey());
                    item.setOrders(entry.getValue());
                    return item;
                })
                .toList();
    }

    private List<NotificationItemDto> buildNotifications(DashboardKpisDto kpis, Integer complianceScore, List<Production> productions) {
        List<NotificationItemDto> notifications = new ArrayList<>();
        if ((kpis.getLowStockItems() != null ? kpis.getLowStockItems() : 0) > 0) {
            NotificationItemDto n = new NotificationItemDto();
            n.setSeverity("CRITICAL");
            n.setTitle("Stock alert");
            n.setMessage(kpis.getLowStockItems() + " materials are below minimum threshold.");
            notifications.add(n);
        }
        long inProgress = productions.stream().filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS).count();
        if (inProgress > 0) {
            NotificationItemDto n = new NotificationItemDto();
            n.setSeverity("WARNING");
            n.setTitle("Production workload");
            n.setMessage(inProgress + " productions are currently in progress.");
            notifications.add(n);
        }
        if ((complianceScore != null ? complianceScore : 0) < 85) {
            NotificationItemDto n = new NotificationItemDto();
            n.setSeverity("WARNING");
            n.setTitle("DPP compliance score");
            n.setMessage("Current score is " + complianceScore + "%. Improve data completeness.");
            notifications.add(n);
        }
        NotificationItemDto info = new NotificationItemDto();
        info.setSeverity("INFO");
        info.setTitle("System health");
        info.setMessage("Dashboard analytics refreshed at " + LocalDateTime.now());
        notifications.add(info);
        return notifications;
    }

    private long countLowStock(List<Stock> stocks) {
        return stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .count();
    }

    private Map<ProductionStatus, Long> groupProductionsByStatus(List<Production> productions) {
        return productions.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(
                        Production::getStatus,
                        () -> new EnumMap<>(ProductionStatus.class),
                        Collectors.counting()
                ));
    }

    private Map<String, Long> groupOrdersByStatus(List<String> statuses) {
        return statuses.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    }

    private void mergeProductionStatusCounts(Map<ProductionStatus, Long> target, Map<ProductionStatus, Long> source) {
        source.forEach((k, v) -> target.merge(k, v, Long::sum));
    }

    private void mergeStringCounts(Map<String, Long> target, Map<String, Long> source) {
        source.forEach((k, v) -> target.merge(k, v, Long::sum));
    }

    private List<String> resolveScopeOrganizationIds(User user) {
        if (permissionService.isAdmin(user)) {
            return organizationRepository.findAll().stream().map(Organization::getId).toList();
        }

        Set<String> ids = new LinkedHashSet<>();
        if (user.getOrganizationId() != null && !user.getOrganizationId().isBlank()) ids.add(user.getOrganizationId());
        if (user.getAssignedOrganizationIds() != null) {
            user.getAssignedOrganizationIds().stream()
                    .filter(Objects::nonNull)
                    .filter(s -> !s.isBlank())
                    .forEach(ids::add);
        }
        return new ArrayList<>(ids);
    }

    private List<String> resolveEffectiveOrganizationIds(User user, List<String> scopeOrgIds, String selectedOrgId) {
        if (selectedOrgId == null || selectedOrgId.isBlank()) {
            return permissionService.isAdmin(user) ? List.of() : scopeOrgIds;
        }
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, selectedOrgId)) {
            throw new ForbiddenException("You do not have access to this organization scope.");
        }
        return List.of(selectedOrgId);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<OrganizationScopeDto> buildOrganizationScopes(List<String> scopeOrgIds) {
        if (scopeOrgIds == null || scopeOrgIds.isEmpty()) return List.of();
        Map<String, String> nameById = organizationRepository.findAllById(scopeOrgIds).stream()
                .collect(Collectors.toMap(Organization::getId, Organization::getName));
        return scopeOrgIds.stream().map(orgId -> {
            OrganizationScopeDto dto = new OrganizationScopeDto();
            dto.setId(orgId);
            dto.setName(nameById.getOrDefault(orgId, orgId));
            return dto;
        }).toList();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

