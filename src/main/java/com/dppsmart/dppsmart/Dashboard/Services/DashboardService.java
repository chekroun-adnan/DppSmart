package com.dppsmart.dppsmart.Dashboard.Services;

import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Dashboard.DTO.DashboardKpisDto;
import com.dppsmart.dppsmart.Dashboard.DTO.DashboardResponseDto;
import com.dppsmart.dppsmart.Dashboard.DTO.UserCountsDto;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
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

    public DashboardResponseDto getMyDashboard() {
        User user = getCurrentUser();

        DashboardResponseDto resp = new DashboardResponseDto();
        resp.setRole(user.getRole());
        resp.setUserEmail(user.getEmail());

        List<String> scopeOrgIds = resolveScopeOrganizationIds(user);
        resp.setOrganizationScopeIds(scopeOrgIds);

        DashboardKpisDto kpis = new DashboardKpisDto();

        if (permissionService.isAdmin(user)) {
            fillAdminKpis(kpis);
        } else {
            fillScopedKpis(kpis, scopeOrgIds);
        }

        resp.setKpis(kpis);
        return resp;
    }

    private void fillAdminKpis(DashboardKpisDto kpis) {
        kpis.setOrganizationsMain((long) organizationRepository.findByOrganizationType(OrganizationType.MAIN).size());
        kpis.setOrganizationsSub((long) organizationRepository.findByOrganizationType(OrganizationType.SUB).size());

        List<User> users = userRepository.findAll();
        UserCountsDto userCounts = new UserCountsDto();
        userCounts.setAdmins(users.stream().filter(u -> u.getRole() == Roles.ADMIN).count());
        userCounts.setSubAdmins(users.stream().filter(u -> u.getRole() == Roles.SUBADMIN).count());
        userCounts.setClients(users.stream().filter(u -> u.getRole() == Roles.CLIENT).count());
        userCounts.setTotal((long) users.size());
        kpis.setUserCounts(userCounts);

        kpis.setProducts(productRepository.count());
        kpis.setProductions(productionRepository.count());
        kpis.setOrders(ordersRepository.count());
        kpis.setEmployees(employeesRepository.count());
        kpis.setScans(scanEventRepository.count());

        kpis.setLowStockItems(countLowStock(stockRepository.findAll()));
        kpis.setProductionsByStatus(groupProductionsByStatus(productionRepository.findAll()));
        kpis.setOrdersByStatus(groupOrdersByStatus(ordersRepository.findAll().stream().map(o -> o.getStatus()).toList()));
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
            return List.of();
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

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

