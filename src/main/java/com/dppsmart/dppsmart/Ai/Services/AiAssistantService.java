package com.dppsmart.dppsmart.Ai.Services;

import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.Permission;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Stock.Entities.Stock;
import com.dppsmart.dppsmart.Stock.Repositories.StockRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AiAssistantService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final OrdersRepository ordersRepository;
    private final ProductionRepository productionRepository;
    private final EmployeesRepository employeesRepository;
    private final ScanEventRepository scanEventRepository;
    private final PermissionService permissionService;
    private final ProductAiScoringService productAiScoringService;

    public AiAssistantService(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            ProductRepository productRepository,
            StockRepository stockRepository,
            OrdersRepository ordersRepository,
            ProductionRepository productionRepository,
            EmployeesRepository employeesRepository,
            ScanEventRepository scanEventRepository,
            PermissionService permissionService,
            ProductAiScoringService productAiScoringService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
        this.ordersRepository = ordersRepository;
        this.productionRepository = productionRepository;
        this.employeesRepository = employeesRepository;
        this.scanEventRepository = scanEventRepository;
        this.permissionService = permissionService;
        this.productAiScoringService = productAiScoringService;
    }

    public String processRequest(String userId, String message) {
        User user = resolveUser(userId);
        String lower = (message == null ? "" : message).trim().toLowerCase(Locale.ROOT);

        if (lower.isBlank() || lower.contains("help") || lower.contains("what can you do")) {
            return baseHelp(user);
        }

        return switch (user.getRole()) {
            case ADMIN -> handleAdmin(user, lower);
            case SUBADMIN -> handleSubAdmin(user, lower);
            case EMPLOYEE -> handleEmployee(user, lower);
            case CLIENT -> handleClient(user, lower);
        };
    }


    private String handleAdmin(User user, String lower) {
        if (!permissionService.hasPermission(user, Permission.AI_INSIGHTS_GLOBAL)) {
            throw new ForbiddenException("You are not allowed to access global AI insights");
        }

        if (containsAny(lower, "pdf", "download pdf", "export pdf", "print")) {
            return """
                    PDF export (ADMIN):
                    Use POST /api/pdf/generate with one of:
                    - type=DASHBOARD_GLOBAL
                    - type=DASHBOARD_ORG + organizationId
                    - type=PRODUCT_DPP + productId
                    - type=ORDERS_ORG + organizationId
                    - type=STOCK_LOW_ORG + organizationId
                    - type=SCANS_ANOMALIES_GLOBAL
                    Example body:
                    { "type": "DASHBOARD_GLOBAL" }
                    """.trim();
        }

        if (containsAny(lower, "overview", "dashboard", "analytics", "summary")) {
            long orgs = organizationRepository.count();
            long products = productRepository.count();
            long orders = ordersRepository.count();
            long productions = productionRepository.count();
            long employees = employeesRepository.count();
            long scans = scanEventRepository.count();

            return """
                    Global analytics (ADMIN):
                    - organizations: %d
                    - products: %d
                    - orders: %d
                    - productions: %d
                    - employees: %d
                    - scans: %d
                    """.formatted(orgs, products, orders, productions, employees, scans).trim();
        }

        if (containsAny(lower, "stock", "low stock", "optimize stock", "reorder")) {
            if (containsAny(lower, "reorder", "reorder plan", "forecast")) {
                return reorderPlanGlobal();
            }
            long lowStock = stockRepository.findAll().stream()
                    .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                    .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                    .count();
            return "Stock optimization: " + lowStock + " items are at/below minimum threshold. Suggestion: review reorder points and suppliers for those SKUs.";
        }

        if (containsAny(lower, "production", "efficiency", "delays", "risk")) {
            if (containsAny(lower, "risk", "delay risk")) {
                return productionRiskGlobal();
            }
            Map<ProductionStatus, Long> byStatus = productionRepository.findAll().stream()
                    .filter(p -> p.getStatus() != null)
                    .collect(Collectors.groupingBy(
                            Production::getStatus,
                            () -> new EnumMap<>(ProductionStatus.class),
                            Collectors.counting()
                    ));
            return "Production efficiency (status counts): " + byStatus;
        }

        if (containsAny(lower, "fraud", "anomaly", "alerts")) {
            if (containsAny(lower, "explain", "why")) return anomalyExplainGlobal();
            return anomalyAlertsGlobal();
        }

        if (containsAny(lower, "employees", "ranking", "performance")) {
            return employeeRankingGlobal();
        }

        if (containsAny(lower, "explain product", "product summary", "product dpp", "dpp coach")) {
            String productId = extractId(lower, "product");
            if (productId == null) return "Please specify: 'explain product <productId>'";
            return explainProduct(productId);
        }

        if (containsAny(lower, "weekly digest", "digest", "weekly report")) {
            return weeklyDigestGlobal();
        }

        return "ADMIN AI: try 'overview', 'stock', 'production', 'employees ranking', or 'anomaly alerts'.";
    }

    private String anomalyAlertsGlobal() {
        LocalDateTime since = LocalDateTime.now().minusHours(1);
        List<ScanEvent> lastHour = scanEventRepository.findByScannedAtAfter(since);
        Map<String, Long> byProduct = lastHour.stream()
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));

        List<Map.Entry<String, Long>> spikes = byProduct.entrySet().stream()
                .filter(e -> e.getValue() >= 50) // simple threshold
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .toList();

        if (spikes.isEmpty()) return "No scan anomalies detected in the last hour (threshold: 50 scans/product/hour).";

        return "Anomaly alerts: scan spikes last hour: " + spikes;
    }

    private String anomalyExplainGlobal() {
        LocalDateTime since = LocalDateTime.now().minusHours(1);
        List<ScanEvent> lastHour = scanEventRepository.findByScannedAtAfter(since);
        Map<String, Long> byProduct = lastHour.stream()
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));
        Optional<Map.Entry<String, Long>> top = byProduct.entrySet().stream()
                .max(Map.Entry.comparingByValue());
        if (top.isEmpty() || top.get().getValue() < 20) {
            return "No strong anomaly to explain in the last hour (top product < 20 scans).";
        }
        String productId = top.get().getKey();
        List<ScanEvent> events = lastHour.stream().filter(e -> productId.equals(e.getProductId())).toList();

        Map<String, Long> byIp = events.stream()
                .map(ScanEvent::getIp).filter(Objects::nonNull)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        Map<String, Long> byUa = events.stream()
                .map(ScanEvent::getUserAgent).filter(Objects::nonNull)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        var topIp = byIp.entrySet().stream().max(Map.Entry.comparingByValue()).orElse(null);
        var topUa = byUa.entrySet().stream().max(Map.Entry.comparingByValue()).orElse(null);

        return """
                Anomaly explanation (last hour):
                - top product: %s (%d scans)
                - top IP: %s
                - top userAgent: %s
                Suggestion: if top IP dominates, check for bot traffic or repeated scanning at a kiosk.
                """.formatted(productId, top.get().getValue(),
                topIp == null ? "(none)" : (topIp.getKey() + " (" + topIp.getValue() + ")"),
                topUa == null ? "(none)" : ("(" + topUa.getValue() + ") " + abbreviate(topUa.getKey(), 80))
        ).trim();
    }

    private String employeeRankingGlobal() {
        var top = employeesRepository.findAll().stream()
                .filter(e -> e.getPerformanceScore() != null)
                .sorted((a, b) -> Double.compare(b.getPerformanceScore(), a.getPerformanceScore()))
                .limit(10)
                .map(e -> "- " + e.getFullName() + " (" + e.getOrganizationId() + "): " + e.getPerformanceScore())
                .toList();
        if (top.isEmpty()) return "No employee performance scores found yet.";
        return "Top employee performance (global):\n" + String.join("\n", top);
    }

    private String weeklyDigestGlobal() {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        long orders = ordersRepository.findAll().stream().filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(since)).count();
        long scans = scanEventRepository.findByScannedAtAfter(since).size();
        long productionsCreated = productionRepository.findAll().stream().filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(since)).count();
        long lowStock = stockRepository.findAll().stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .count();
        return """
                Weekly digest (last 7 days):
                - orders created: %d
                - scans recorded: %d
                - productions created: %d
                - low stock items (current): %d
                Tip: Use 'export pdf' to download printable reports.
                """.formatted(orders, scans, productionsCreated, lowStock).trim();
    }

    private String reorderPlanGlobal() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<Orders> recent = ordersRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(since))
                .toList();
        Map<String, Long> demandByOrg = recent.stream()
                .filter(o -> o.getOrganizationId() != null)
                .collect(Collectors.groupingBy(Orders::getOrganizationId, Collectors.summingLong(o -> o.getQuantity() == null ? 0 : o.getQuantity())));

        var lowStockByOrg = stockRepository.findAll().stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .collect(Collectors.groupingBy(Stock::getOrganizationId, Collectors.counting()));

        return "Reorder plan (heuristic): demand last 30d by org=" + demandByOrg + ", low-stock items by org=" + lowStockByOrg;
    }

    private String productionRiskGlobal() {
        LocalDateTime now = LocalDateTime.now();
        List<Production> inProgress = productionRepository.findAll().stream()
                .filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS)
                .toList();
        if (inProgress.isEmpty()) return "No IN_PROGRESS productions found.";

        List<String> risky = new ArrayList<>();
        for (Production p : inProgress) {
            long maxAgeDays = maxStepAgeDays(now, p.getSteps());
            if (maxAgeDays >= 7) risky.add("- production " + p.getId() + " (org " + p.getOrganizationId() + "): max step age " + maxAgeDays + " days");
        }
        if (risky.isEmpty()) return "Production delay risk: no stalled steps detected (threshold: 7 days since step start).";
        return "Production delay risk (stalled steps):\n" + String.join("\n", risky);
    }


    private String handleSubAdmin(User user, String lower) {
        if (!permissionService.hasPermission(user, Permission.AI_INSIGHTS_ORG)) {
            throw new ForbiddenException("You are not allowed to access organization AI insights");
        }

        List<String> scopeOrgIds = resolveScopeOrganizationIds(user);
        if (scopeOrgIds.isEmpty()) {
            return "No organization scope found for your user. Ask an ADMIN to assign organizations.";
        }

        if (containsAny(lower, "pdf", "download pdf", "export pdf", "print")) {
            return "PDF export is restricted to ADMIN. Ask an ADMIN to download the report you need.";
        }

        if (containsAny(lower, "overview", "summary", "dashboard")) {
            return orgOverview(scopeOrgIds);
        }

        if (containsAny(lower, "stock", "shortage", "low stock", "reorder", "forecast")) {
            if (containsAny(lower, "reorder", "forecast")) return reorderPlanOrg(scopeOrgIds);
            return orgLowStock(scopeOrgIds);
        }

        if (containsAny(lower, "production", "delay", "warning", "risk")) {
            if (containsAny(lower, "risk", "delay risk")) return productionRiskOrg(scopeOrgIds);
            return orgProductionWarnings(scopeOrgIds);
        }

        if (containsAny(lower, "orders", "demand", "prediction")) {
            return orgOrdersInsights(scopeOrgIds);
        }

        if (containsAny(lower, "employees", "workload", "balance")) {
            return orgEmployeeInsights(scopeOrgIds);
        }

        if (containsAny(lower, "explain product", "product summary", "dpp coach")) {
            String productId = extractId(lower, "product");
            if (productId == null) return "Please specify: 'explain product <productId>'";
            return explainProduct(productId);
        }

        if (containsAny(lower, "weekly digest", "digest", "weekly report")) {
            return weeklyDigestOrg(scopeOrgIds);
        }

        return "SUB_ADMIN AI: try 'overview', 'stock shortage', 'production warnings', 'orders demand', or 'employees workload'.";
    }

    private String orgOverview(List<String> orgIds) {
        long products = 0, orders = 0, productions = 0, employees = 0, scans = 0;
        for (String orgId : orgIds) {
            products += productRepository.findByOrganizationId(orgId).size();
            orders += ordersRepository.findByOrganizationId(orgId).size();
            productions += productionRepository.findByOrganizationId(orgId).size();
            employees += employeesRepository.findByOrganizationId(orgId).size();
            scans += scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(orgId).size();
        }
        return """
                Organization insights:
                - orgScope: %s
                - products: %d
                - orders: %d
                - productions: %d
                - employees: %d
                - scans: %d
                """.formatted(orgIds, products, orders, productions, employees, scans).trim();
    }

    private String orgLowStock(List<String> orgIds) {
        List<Stock> stocks = orgIds.stream()
                .flatMap(id -> stockRepository.findByOrganizationId(id).stream())
                .toList();
        long low = stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .count();
        return "Stock shortage prediction: " + low + " low-stock items in your scope. Suggestion: prioritize replenishment for items below threshold and review minimumThreshold.";
    }

    private String orgProductionWarnings(List<String> orgIds) {
        List<Production> prods = orgIds.stream()
                .flatMap(id -> productionRepository.findByOrganizationId(id).stream())
                .toList();
        Map<ProductionStatus, Long> byStatus = prods.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(
                        Production::getStatus,
                        () -> new EnumMap<>(ProductionStatus.class),
                        Collectors.counting()
                ));
        return "Production delay warnings (status counts): " + byStatus + ". Suggestion: investigate IN_PROGRESS items with stalled steps.";
    }

    private String orgOrdersInsights(List<String> orgIds) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Orders> recent = ordersRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(since))
                .filter(o -> orgIds.contains(o.getOrganizationId()))
                .toList();

        Map<String, Long> byStatus = recent.stream()
                .map(Orders::getStatus)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        return "Order demand (last 7 days): " + recent.size() + " orders. Status distribution: " + byStatus;
    }

    private String orgEmployeeInsights(List<String> orgIds) {
        var emps = orgIds.stream()
                .flatMap(id -> employeesRepository.findByOrganizationId(id).stream())
                .toList();
        if (emps.isEmpty()) return "No employees found in your organization scope.";

        double avg = emps.stream()
                .map(e -> e.getPerformanceScore() == null ? 0.0 : e.getPerformanceScore())
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        return "Employee workload balancing: " + emps.size() + " employees. Avg performanceScore=" + Math.round(avg * 10.0) / 10.0 + ". Suggestion: support low performers and redistribute workload if needed.";
    }

    private String weeklyDigestOrg(List<String> orgIds) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        long orders = ordersRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(since))
                .filter(o -> orgIds.contains(o.getOrganizationId()))
                .count();
        long scans = scanEventRepository.findByScannedAtAfter(since).stream()
                .filter(s -> orgIds.contains(s.getOrganizationId()))
                .count();
        long lowStock = orgIds.stream()
                .flatMap(id -> stockRepository.findByOrganizationId(id).stream())
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .count();
        return """
                Weekly digest (org scope last 7 days):
                - orders created: %d
                - scans recorded: %d
                - low stock items (current): %d
                """.formatted(orders, scans, lowStock).trim();
    }

    private String reorderPlanOrg(List<String> orgIds) {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<Orders> recent = ordersRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(since))
                .filter(o -> orgIds.contains(o.getOrganizationId()))
                .toList();
        long demand = recent.stream().mapToLong(o -> o.getQuantity() == null ? 0 : o.getQuantity()).sum();
        long lowStockItems = orgIds.stream()
                .flatMap(id -> stockRepository.findByOrganizationId(id).stream())
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null)
                .filter(s -> s.getQuantity() <= s.getMinimumThreshold())
                .count();
        return "Reorder forecast (heuristic): last 30d order quantity=" + demand + ", low-stock items=" + lowStockItems + ". Suggestion: prioritize replenishment of items below minimumThreshold.";
    }

    private String productionRiskOrg(List<String> orgIds) {
        LocalDateTime now = LocalDateTime.now();
        List<Production> inProgress = orgIds.stream()
                .flatMap(id -> productionRepository.findByOrganizationId(id).stream())
                .filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS)
                .toList();
        if (inProgress.isEmpty()) return "No IN_PROGRESS productions found in your scope.";

        List<String> risky = new ArrayList<>();
        for (Production p : inProgress) {
            long maxAgeDays = maxStepAgeDays(now, p.getSteps());
            if (maxAgeDays >= 7) risky.add("- production " + p.getId() + ": max step age " + maxAgeDays + " days");
        }
        if (risky.isEmpty()) return "Production delay risk: no stalled steps detected (threshold: 7 days since step start).";
        return "Production delay risk (stalled steps):\n" + String.join("\n", risky);
    }


    private String handleEmployee(User user, String lower) {
        if (!permissionService.hasPermission(user, Permission.AI_ASSISTANT_BASIC)) {
            throw new ForbiddenException("You are not allowed to use the AI assistant");
        }

        if (containsAny(lower, "explain product", "product summary", "dpp coach")) {
            String productId = extractId(lower, "product");
            if (productId == null) return "Please specify: 'explain product <productId>'";
            return explainProduct(productId);
        }

        if (containsAny(lower, "scan", "scanning", "qr")) {
            return """
                    Scanning help:
                    - Use the product QR code to open the DPP URL.
                    - If your app records scans, ensure location is enabled (optional).
                    - If a product is not found, verify the productId exists in the system.
                    """.trim();
        }

        if (containsAny(lower, "production", "steps", "complete step")) {
            return "Production help: follow the production step order, start a step when work begins, and complete it when finished. If you get blocked, report the stepIndex + productionId to your manager.";
        }

        return "EMPLOYEE assistant: ask about 'scan' or 'production steps'. Task assignment features can be added when a Task module exists.";
    }


    private String handleClient(User user, String lower) {
        if (!permissionService.hasPermission(user, Permission.AI_ASSISTANT_BASIC)) {
            throw new ForbiddenException("You are not allowed to use the AI assistant");
        }

        if (containsAny(lower, "track", "order", "my orders")) {
            long count = ordersRepository.findAll().stream()
                    .filter(o -> user.getEmail() != null && user.getEmail().equals(o.getCreatedBy()))
                    .count();
            return "You currently have " + count + " orders. Use the Orders screen to see status and details.";
        }

        if (containsAny(lower, "explain product", "product summary", "dpp")) {
            String productId = extractId(lower, "product");
            if (productId == null) return "Please specify: 'explain product <productId>'";
            return explainProduct(productId);
        }

        if (containsAny(lower, "recommend", "products", "suggest")) {
            return productRecommendations();
        }

        return "CLIENT assistant: ask 'recommend products' or 'track my orders'.";
    }

    private String productRecommendations() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<ScanEvent> scans = scanEventRepository.findByScannedAtAfter(since);
        Map<String, Long> counts = scans.stream()
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));

        List<String> topProductIds = counts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .toList();

        if (topProductIds.isEmpty()) return "No recommendations yet (no recent scan data).";

        Map<String, Product> byId = productRepository.findAllById(topProductIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a));

        List<String> lines = new ArrayList<>();
        for (String pid : topProductIds) {
            Product p = byId.get(pid);
            if (p != null) lines.add("- " + safe(p.getProductName()) + " (id: " + p.getId() + ")");
        }
        return "Recommended products (popular scans last 30 days):\n" + String.join("\n", lines);
    }

    private String explainProduct(String productId) {
        Product p = productRepository.findById(productId).orElse(null);
        if (p == null) return "Product not found: " + productId;

        var score = productAiScoringService.scoreProduct(p);

        String template = """
                Suggested additionalInfo template:
                {
                  "origin": "",
                  "composition": "",
                  "care": "",
                  "recycling": "",
                  "batch": ""
                }
                """.trim();

        return """
                Product summary:
                - id: %s
                - name: %s
                - category: %s
                - material: %s
                - certification: %s

                DPP quality score: %d/100
                Summary: %s
                Missing fields: %s

                %s
                """.formatted(
                p.getId(),
                safe(p.getProductName()),
                safe(p.getCategory()),
                safe(p.getMaterial()),
                safe(p.getCertification()),
                score.getScore(),
                score.getSummary(),
                String.join(", ", score.getMissingFields()),
                template
        ).trim();
    }


    private User resolveUser(String userId) {
        if (userId != null && !userId.isBlank()) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("User not found"));
        }
        throw new ForbiddenException("Unauthenticated");
    }

    private List<String> resolveScopeOrganizationIds(User user) {
        if (permissionService.isAdmin(user)) return List.of();
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

    private boolean containsAny(String lower, String... needles) {
        for (String n : needles) if (lower.contains(n)) return true;
        return false;
    }

    private String extractId(String lower, String keyword) {
        int idx = lower.indexOf(keyword + " ");
        if (idx < 0) return null;
        String tail = lower.substring(idx + keyword.length()).trim();
        String[] parts = tail.split("\\s+");
        if (parts.length == 0) return null;
        String candidate = parts[0].trim();
        return candidate.isBlank() ? null : candidate;
    }

    private long maxStepAgeDays(LocalDateTime now, List<ProductionStep> steps) {
        if (steps == null || steps.isEmpty()) return 0;
        long max = 0;
        for (ProductionStep s : steps) {
            if (s == null) continue;
            if (s.isCompleted()) continue;
            if (s.getStartDate() == null) continue;
            long days = ChronoUnit.DAYS.between(s.getStartDate(), now);
            if (days > max) max = days;
        }
        return max;
    }

    private String abbreviate(String s, int maxLen) {
        if (s == null) return "";
        if (s.length() <= maxLen) return s;
        return s.substring(0, Math.max(0, maxLen - 3)) + "...";
    }

    private String safe(String s) {
        return (s == null || s.isBlank()) ? "(not set)" : s;
    }

    private String baseHelp(User user) {
        return switch (user.getRole()) {
            case ADMIN -> "ADMIN AI: try 'overview', 'weekly digest', 'reorder plan', 'production risk', 'anomaly alerts', 'explain product <id>', or 'export pdf'.";
            case SUBADMIN -> "SUB_ADMIN AI: try 'overview', 'weekly digest', 'stock shortage', 'reorder forecast', 'production risk', 'orders demand', 'employees workload', or 'explain product <id>'.";
            case EMPLOYEE -> "EMPLOYEE AI: try 'scan help', 'production steps', or 'explain product <id>'.";
            case CLIENT -> "CLIENT AI: try 'recommend products', 'track my orders', or 'explain product <id>'.";
        };
    }
}

