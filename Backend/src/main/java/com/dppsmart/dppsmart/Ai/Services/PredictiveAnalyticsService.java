package com.dppsmart.dppsmart.Ai.Services;

import com.dppsmart.dppsmart.Ai.DTO.*;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.Permission;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PredictiveAnalyticsService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private MaterialStockRepository materialStockRepository;
    @Autowired
    private OrdersRepository ordersRepository;
    @Autowired
    private ProductionRepository productionRepository;
    @Autowired
    private ScanEventRepository scanEventRepository;
    @Autowired
    private PermissionService permissionService;

    public PredictiveAnalyticsService(
            UserRepository userRepository,
            ProductRepository productRepository,
            MaterialStockRepository materialStockRepository,
            OrdersRepository ordersRepository,
            ProductionRepository productionRepository,
            ScanEventRepository scanEventRepository,
            PermissionService permissionService
    ) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.materialStockRepository = materialStockRepository;
        this.ordersRepository = ordersRepository;
        this.productionRepository = productionRepository;
        this.scanEventRepository = scanEventRepository;
        this.permissionService = permissionService;
    }

    public PredictiveAnalysisDto analyze(String organizationId, String scope) {
        User user = getCurrentUser();
        validateAccess(user, organizationId, scope);

        GatheredData data = gatherData(organizationId, scope);
        String aiSummary = getAiSummary(data, scope);
        String aiInsights = getAiInsights(data, scope);
        String aiRecommendations = getAiRecommendations(data, scope);

        PredictiveAnalysisDto dto = new PredictiveAnalysisDto();
        dto.setSummary(aiSummary);
        dto.setKeyInsights(parseList(aiInsights));
        dto.setRecommendations(parseList(aiRecommendations));
        dto.setForecasts(computeForecasts(data));
        dto.setAnomalies(computeAnomalies(data));
        dto.setRiskScore(computeRiskScore(data));
        dto.setTrendData(computeTrendData(data));
        dto.setRealData(buildRealData(data));
        dto.setRawResponse("");
        return dto;
    }

    private void validateAccess(User user, String orgId, String scope) {
        String effectiveScope = scope != null ? scope : "ORG";
        if ("GLOBAL".equals(effectiveScope)) {
            if (!permissionService.hasPermission(user, Permission.AI_INSIGHTS_GLOBAL)) {
                throw new ForbiddenException("Global AI insights require elevated permissions");
            }
        } else {
            if (!permissionService.hasPermission(user, Permission.AI_INSIGHTS_ORG)) {
                throw new ForbiddenException("Organization AI insights require elevated permissions");
            }
            if (orgId != null && !permissionService.canAccessOrganization(user, orgId)) {
                throw new ForbiddenException("You are not allowed to analyze this organization");
            }
        }
    }

    private GatheredData gatherData(String orgId, String scope) {
        GatheredData data = new GatheredData();
        LocalDateTime now = LocalDateTime.now();

        List<ScanEvent> scans = gatherScans(orgId, scope);
        List<Orders> orders = gatherOrders(orgId, scope);
        List<Production> productions = gatherProductions(orgId, scope);
        List<MaterialStock> stocks = gatherStocks(orgId, scope);

        data.scans = scans;
        data.orders = orders;
        data.productions = productions;
        data.stocks = stocks;

        data.totalScans = (int) scans.size();
        data.uniqueProductsScanned = (int) scans.stream().map(ScanEvent::getProductId).filter(Objects::nonNull).distinct().count();
        data.totalOrders = (int) orders.size();
        data.totalProductions = (int) productions.size();
        data.lowStockCount = (int) stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null && s.getQuantity() <= s.getMinimumThreshold())
                .count();
        data.criticalStockCount = (int) stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null && s.getQuantity() == 0)
                .count();
        data.totalProducts = productRepository.count();

        data.scansLast7Days = (int) scans.stream().filter(s -> s.getScannedAt() != null && s.getScannedAt().isAfter(now.minusDays(7))).count();
        data.scansLast30Days = (int) scans.stream().filter(s -> s.getScannedAt() != null && s.getScannedAt().isAfter(now.minusDays(30))).count();
        data.ordersLast7Days = (int) orders.stream().filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(now.minusDays(7))).count();
        data.ordersLast30Days = (int) orders.stream().filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(now.minusDays(30))).count();
        data.productionsLast7Days = (int) productions.stream().filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(now.minusDays(7))).count();

        data.ordersByStatus = orders.stream()
                .filter(o -> o.getStatus() != null)
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));
        data.productionsByStatus = productions.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting()));

        List<TrendPoint> scansByDay = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime dayEnd = dayStart.plusDays(1);
            long count = scans.stream().filter(s -> s.getScannedAt() != null && !s.getScannedAt().isBefore(dayStart) && s.getScannedAt().isBefore(dayEnd)).count();
            double predicted = simpleMovingAverage(scansByDay, count, 7);
            scansByDay.add(new TrendPoint(dayStart.toLocalDate().toString(), count, predicted));
        }
        data.scansByDay = scansByDay;

        List<TrendPoint> ordersByDay = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime dayEnd = dayStart.plusDays(1);
            long count = orders.stream().filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(dayStart) && o.getCreatedAt().isBefore(dayEnd)).count();
            double predicted = simpleMovingAverage(ordersByDay, count, 7);
            ordersByDay.add(new TrendPoint(dayStart.toLocalDate().toString(), count, predicted));
        }
        data.ordersByDay = ordersByDay;

        List<TrendPoint> prodByDay = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime dayEnd = dayStart.plusDays(1);
            long count = productions.stream().filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(dayStart) && p.getCreatedAt().isBefore(dayEnd)).count();
            double predicted = simpleMovingAverage(prodByDay, count, 7);
            prodByDay.add(new TrendPoint(dayStart.toLocalDate().toString(), count, predicted));
        }
        data.productionsByDay = prodByDay;

        data.lowStockItems = stocks.stream()
                .filter(s -> s.getQuantity() != null && s.getMinimumThreshold() != null && s.getQuantity() <= s.getMinimumThreshold())
                .map(s -> new RealDataDto.LowStockItem(s.getId(), s.getName(), s.getQuantity(), s.getMinimumThreshold()))
                .limit(10)
                .collect(Collectors.toList());

        data.topScannedProducts = scans.stream()
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));

        return data;
    }

    private double simpleMovingAverage(List<TrendPoint> history, long current, int window) {
        if (history.isEmpty()) return current;
        int start = Math.max(0, history.size() - window);
        double sum = 0;
        int count = 0;
        for (int i = start; i < history.size(); i++) {
            sum += history.get(i).getValue();
            count++;
        }
        if (count == 0) return current;
        return Math.round((sum / count) * 10.0) / 10.0;
    }

    private List<ScanEvent> gatherScans(String orgId, String scope) {
        if ("GLOBAL".equals(scope)) return scanEventRepository.findAll();
        if (orgId != null) return scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(orgId);
        return scanEventRepository.findAll();
    }

    private List<Orders> gatherOrders(String orgId, String scope) {
        if ("GLOBAL".equals(scope)) return ordersRepository.findAll();
        if (orgId != null) return ordersRepository.findByOrganizationId(orgId);
        return ordersRepository.findAll();
    }

    private List<Production> gatherProductions(String orgId, String scope) {
        if ("GLOBAL".equals(scope)) return productionRepository.findAll();
        if (orgId != null) return productionRepository.findByOrganizationId(orgId);
        return productionRepository.findAll();
    }

    private List<MaterialStock> gatherStocks(String orgId, String scope) {
        if ("GLOBAL".equals(scope)) return materialStockRepository.findAll();
        if (orgId != null) return materialStockRepository.findByOrganizationId(orgId);
        return materialStockRepository.findAll();
    }

    private String getAiSummary(GatheredData data, String scope) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallbackSummary(data);
        }
        try {
            String prompt = "Based on this data for scope " + scope + ":\n"
                    + "Scans: total=" + data.totalScans + ", last7d=" + data.scansLast7Days + ", last30d=" + data.scansLast30Days + "\n"
                    + "Orders: total=" + data.totalOrders + ", last7d=" + data.ordersLast7Days + ", last30d=" + data.ordersLast30Days + "\n"
                    + "Productions: total=" + data.totalProductions + ", last7d=" + data.productionsLast7Days + "\n"
                    + "Low stock items: " + data.lowStockCount + ", Critical (zero stock): " + data.criticalStockCount + "\n"
                    + "Order statuses: " + data.ordersByStatus + "\n"
                    + "Production statuses: " + data.productionsByStatus + "\n"
                    + "Give a 2-3 sentence executive summary of current state and near-term outlook. Be concise.";
            return callGroqText(prompt);
        } catch (Exception e) {
            return buildFallbackSummary(data);
        }
    }

    private String getAiInsights(GatheredData data, String scope) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallbackInsights(data);
        }
        try {
            String prompt = "Based on this data for scope " + scope + ":\n"
                    + "Scans last 7d: " + data.scansLast7Days + ", 30d: " + data.scansLast30Days + "\n"
                    + "Orders last 7d: " + data.ordersLast7Days + ", 30d: " + data.ordersLast30Days + "\n"
                    + "Productions by status: " + data.productionsByStatus + "\n"
                    + "Low stock: " + data.lowStockCount + ", critical: " + data.criticalStockCount + "\n"
                    + "Top scanned products: " + topN(data.topScannedProducts, 5) + "\n"
                    + "Give exactly 3 numbered key insights as a JSON array of strings. Return ONLY the JSON array.";
            return callGroqText(prompt);
        } catch (Exception e) {
            return buildFallbackInsights(data);
        }
    }

    private String getAiRecommendations(GatheredData data, String scope) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallbackRecommendations(data);
        }
        try {
            String prompt = "Based on this data for scope " + scope + ":\n"
                    + "Scans last 7d: " + data.scansLast7Days + ", orders last 7d: " + data.ordersLast7Days + "\n"
                    + "Low stock: " + data.lowStockCount + ", critical: " + data.criticalStockCount + "\n"
                    + "Productions by status: " + data.productionsByStatus + "\n"
                    + "Give exactly 3 numbered actionable recommendations as a JSON array of strings. Return ONLY the JSON array.";
            return callGroqText(prompt);
        } catch (Exception e) {
            return buildFallbackRecommendations(data);
        }
    }

    private String callGroqText(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", "You are a business analytics assistant. Respond only with the requested format."),
                Map.of("role", "user", "content", prompt)
        ));
        payload.put("temperature", 0.3);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

        if (response.getBody() == null) return "";

        Object choicesObj = response.getBody().get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) return "";
        Object first = choices.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) return "";
        Object msgObj = firstMap.get("message");
        if (!(msgObj instanceof Map<?, ?> msgMap)) return "";
        Object content = msgMap.get("content");
        return content == null ? "" : content.toString();
    }

    private List<ForecastItem> computeForecasts(GatheredData data) {
        List<ForecastItem> forecasts = new ArrayList<>();

        double avgScansPerDay = data.scansLast30Days / 30.0;
        double predictedScans7d = Math.round(avgScansPerDay * 7 * 10.0) / 10.0;
        double scanConfidence = Math.min(0.95, 0.5 + (data.scansLast30Days > 100 ? 0.3 : data.scansLast30Days / 300.0));
        forecasts.add(new ForecastItem(
                "Expected Scans (7d)",
                String.format("%.0f scans", predictedScans7d),
                scanConfidence,
                "7 days"
        ));

        double avgOrdersPerDay = data.ordersLast30Days / 30.0;
        double predictedOrders7d = Math.round(avgOrdersPerDay * 7 * 10.0) / 10.0;
        double orderConfidence = Math.min(0.9, 0.4 + (data.ordersLast30Days > 50 ? 0.3 : data.ordersLast30Days / 200.0));
        forecasts.add(new ForecastItem(
                "Expected Orders (7d)",
                String.format("%.0f orders", predictedOrders7d),
                orderConfidence,
                "7 days"
        ));

        String stockUrgency = "LOW";
        double stockConfidence = 0.5;
        if (data.criticalStockCount > 0) {
            stockUrgency = "CRITICAL";
            stockConfidence = 0.95;
        } else if (data.lowStockCount > 5) {
            stockUrgency = "HIGH";
            stockConfidence = 0.8;
        } else if (data.lowStockCount > 0) {
            stockUrgency = "MEDIUM";
            stockConfidence = 0.7;
        }
        forecasts.add(new ForecastItem(
                "Stock Reorder Urgency",
                stockUrgency,
                stockConfidence,
                "immediate"
        ));

        return forecasts;
    }

    private List<AnomalyItem> computeAnomalies(GatheredData data) {
        List<AnomalyItem> anomalies = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        Map<String, Long> scanSpikesLastHour = data.scans.stream()
                .filter(s -> s.getScannedAt() != null && s.getScannedAt().isAfter(now.minusHours(1)))
                .filter(s -> s.getProductId() != null)
                .collect(Collectors.groupingBy(ScanEvent::getProductId, Collectors.counting()));
        scanSpikesLastHour.entrySet().stream()
                .filter(e -> e.getValue() > 20)
                .forEach(e -> anomalies.add(new AnomalyItem(
                        "SCAN_SPIKE",
                        "Product " + e.getKey() + " has " + e.getValue() + " scans in the last hour",
                        e.getValue() > 50 ? "HIGH" : "MEDIUM",
                        e.getKey()
                )));

        for (Production p : data.productions) {
            if (p.getStatus() == ProductionStatus.IN_PROGRESS && p.getSteps() != null) {
                for (ProductionStep step : p.getSteps()) {
                    if (step.getStartDate() != null && !Boolean.TRUE.equals(step.getCompleted())) {
                        long daysStalled = ChronoUnit.DAYS.between(step.getStartDate(), now);
                        if (daysStalled > 5) {
                            anomalies.add(new AnomalyItem(
                                    "PRODUCTION_DELAY",
                                    "Production " + p.getId() + " step stalled for " + daysStalled + " days",
                                    daysStalled > 14 ? "HIGH" : "MEDIUM",
                                    p.getId()
                            ));
                        }
                    }
                }
            }
        }

        for (MaterialStock s : data.stocks) {
            if (s.getQuantity() != null && s.getMinimumThreshold() != null && s.getQuantity() == 0) {
                anomalies.add(new AnomalyItem(
                        "STOCK_OUT",
                        (s.getName() != null ? s.getName() : s.getId()) + " is out of stock",
                        "CRITICAL",
                        s.getId()
                ));
            } else if (s.getQuantity() != null && s.getMinimumThreshold() != null && s.getQuantity() <= s.getMinimumThreshold()) {
                anomalies.add(new AnomalyItem(
                        "LOW_STOCK",
                        (s.getName() != null ? s.getName() : s.getId()) + " is below minimum threshold (" + s.getQuantity() + "/" + s.getMinimumThreshold() + ")",
                        "MEDIUM",
                        s.getId()
                ));
            }
        }

        return anomalies.stream().limit(20).collect(Collectors.toList());
    }

    private RiskScore computeRiskScore(GatheredData data) {
        int stockRisk = 0;
        if (data.criticalStockCount > 0) stockRisk = 90;
        else if (data.lowStockCount > 10) stockRisk = 70;
        else if (data.lowStockCount > 5) stockRisk = 50;
        else if (data.lowStockCount > 0) stockRisk = 30;
        else stockRisk = 10;

        int prodRisk = 0;
        Long inProgress = data.productionsByStatus.get("IN_PROGRESS");
        Long delayed = data.productionsByStatus.get("DELAYED");
        long atRisk = (inProgress != null ? inProgress : 0) + (delayed != null ? delayed : 0);
        if (atRisk > data.totalProductions * 0.5 && data.totalProductions > 0) prodRisk = 80;
        else if (atRisk > data.totalProductions * 0.3 && data.totalProductions > 0) prodRisk = 55;
        else if (atRisk > 0) prodRisk = 30;
        else prodRisk = 10;

        int supplyRisk = stockRisk;
        if (data.ordersLast7Days > data.ordersLast30Days / 4 && data.ordersLast30Days > 0) {
            supplyRisk = Math.min(95, stockRisk + 20);
        }

        int demandRisk = 50;
        if (data.scansLast30Days > 100) demandRisk = 20;
        else if (data.scansLast30Days > 50) demandRisk = 35;
        else if (data.scansLast30Days > 0) demandRisk = 55;
        else demandRisk = 75;

        int overall = (stockRisk + prodRisk + supplyRisk + demandRisk) / 4;

        return new RiskScore(overall, supplyRisk, prodRisk, stockRisk, demandRisk);
    }

    private TrendData computeTrendData(GatheredData data) {
        TrendData td = new TrendData();
        td.setScansTrend(data.scansByDay);
        td.setOrdersTrend(data.ordersByDay);
        td.setProductionTrend(data.productionsByDay);
        return td;
    }

    private RealDataDto buildRealData(GatheredData data) {
        RealDataDto rd = new RealDataDto();
        rd.setTotalScans(data.totalScans);
        rd.setScansLast7Days(data.scansLast7Days);
        rd.setScansLast30Days(data.scansLast30Days);
        rd.setUniqueProductsScanned(data.uniqueProductsScanned);
        rd.setTotalOrders(data.totalOrders);
        rd.setOrdersLast7Days(data.ordersLast7Days);
        rd.setOrdersLast30Days(data.ordersLast30Days);
        rd.setTotalProductions(data.totalProductions);
        rd.setProductionsLast7Days(data.productionsLast7Days);
        rd.setLowStockCount(data.lowStockCount);
        rd.setCriticalStockCount(data.criticalStockCount);
        rd.setTotalProducts(data.totalProducts);
        rd.setOrdersByStatus(data.ordersByStatus);
        rd.setProductionsByStatus(data.productionsByStatus);
        rd.setScansByDay(data.scansByDay);
        rd.setOrdersByDay(data.ordersByDay);
        rd.setLowStockItems(data.lowStockItems);
        rd.setTopScannedProducts(topN(data.topScannedProducts, 10));
        return rd;
    }

    private Map<String, Long> topN(Map<String, Long> map, int n) {
        return map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(n)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
    }

    private String buildFallbackSummary(GatheredData data) {
        StringBuilder sb = new StringBuilder();
        sb.append("Platform currently has ").append(data.totalScans).append(" total scans");
        if (data.scansLast7Days > 0) sb.append(" (").append(data.scansLast7Days).append(" in the last 7 days)");
        sb.append(". ");
        sb.append(data.totalOrders).append(" orders on record");
        if (data.ordersLast7Days > 0) sb.append(", ").append(data.ordersLast7Days).append(" in the last 7 days.");
        if (data.lowStockCount > 0) {
            sb.append(" ").append(data.lowStockCount).append(" items are at/below minimum threshold");
            if (data.criticalStockCount > 0) sb.append(" (").append(data.criticalStockCount).append(" are out of stock)");
            sb.append(".");
        }
        return sb.toString();
    }

    private String buildFallbackInsights(GatheredData data) {
        List<String> insights = new ArrayList<>();
        if (data.scansLast30Days > 0) {
            double growth = data.scansLast7Days > 0 && data.scansLast30Days > 0
                    ? ((double) data.scansLast7Days / (data.scansLast30Days / 4) - 1) * 100 : 0;
            if (growth > 10) insights.add("Scan activity is growing: +" + Math.round(growth) + "% week-over-week comparison.");
            else if (growth < -10) insights.add("Scan activity is declining: " + Math.round(growth) + "% week-over-week comparison.");
            else insights.add("Scan activity is stable with " + data.scansLast7Days + " scans in the last 7 days.");
        } else {
            insights.add("No scans recorded yet. Products are available but not being scanned.");
        }
        if (data.ordersLast7Days > data.ordersLast30Days / 4) {
            insights.add("Order volume is healthy: " + data.ordersLast7Days + " orders in the last 7 days out of " + data.ordersLast30Days + " in 30 days.");
        }
        if (data.lowStockCount > 0) {
            insights.add("Stock concern: " + data.lowStockCount + " items are below minimum threshold.");
        } else {
            insights.add("Stock levels are healthy across all tracked materials.");
        }
        return "[\"" + String.join("\",\"", insights) + "\"]";
    }

    private String buildFallbackRecommendations(GatheredData data) {
        List<String> recs = new ArrayList<>();
        if (data.lowStockCount > 0) {
            recs.add("Review and replenish " + data.lowStockCount + " low-stock items immediately. " + data.criticalStockCount + " items are completely out of stock.");
        }
        if (data.ordersLast30Days > 0) {
            double avgDaily = data.ordersLast30Days / 30.0;
            recs.add("Current order rate: " + String.format("%.1f", avgDaily) + " orders/day. Plan procurement accordingly.");
        }
        if (data.totalScans > 0 && data.uniqueProductsScanned < data.totalProducts) {
            long unscanned = data.totalProducts - data.uniqueProductsScanned;
            recs.add(unscanned + " products have never been scanned. Encourage customer engagement with QR codes.");
        } else if (data.totalScans == 0) {
            recs.add("No scans yet. Ensure DPP URLs are distributed and QR codes are accessible to end customers.");
        }
        return "[\"" + String.join("\",\"", recs) + "\"]";
    }

    private List<String> parseList(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        try {
            raw = raw.trim();
            if (raw.startsWith("[")) {
                @SuppressWarnings("unchecked")
                List<String> parsed = objectMapper.readValue(raw, List.class);
                return parsed;
            }
            List<String> result = new ArrayList<>();
            for (String line : raw.split("\n")) {
                line = line.replaceAll("^\\d+[\\.\\)\\-\\s]+", "").trim();
                if (!line.isBlank() && !line.startsWith("{")) result.add(line);
            }
            return result;
        } catch (Exception e) {
            return List.of(raw);
        }
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private static class GatheredData {
        List<ScanEvent> scans = List.of();
        List<Orders> orders = List.of();
        List<Production> productions = List.of();
        List<MaterialStock> stocks = List.of();
        int totalScans = 0;
        int uniqueProductsScanned = 0;
        int totalOrders = 0;
        int totalProductions = 0;
        int lowStockCount = 0;
        int criticalStockCount = 0;
        long totalProducts = 0;
        int scansLast7Days = 0;
        int scansLast30Days = 0;
        int ordersLast7Days = 0;
        int ordersLast30Days = 0;
        int productionsLast7Days = 0;
        Map<String, Long> ordersByStatus = Map.of();
        Map<String, Long> productionsByStatus = Map.of();
        List<TrendPoint> scansByDay = List.of();
        List<TrendPoint> ordersByDay = List.of();
        List<TrendPoint> productionsByDay = List.of();
        List<RealDataDto.LowStockItem> lowStockItems = List.of();
        Map<String, Long> topScannedProducts = Map.of();
    }
}
