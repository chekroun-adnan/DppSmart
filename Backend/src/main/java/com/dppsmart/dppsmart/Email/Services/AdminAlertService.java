package com.dppsmart.dppsmart.Email.Services;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.Task.Entities.Task;
import com.dppsmart.dppsmart.Task.Entities.TaskStatus;
import com.dppsmart.dppsmart.Task.Repositories.TaskRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAlertService {

    private final UserRepository userRepository;
    private final MaterialStockRepository materialStockRepository;
    private final TaskRepository taskRepository;
    private final MaterialOrderRepository materialOrderRepository;
    private final ProductionRepository productionRepository;
    private final EmailService emailService;

    
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyAdminAlerts() {
        List<User> admins = userRepository.findByRole(Roles.ADMIN);
        List<User> subAdmins = userRepository.findByRole(Roles.SUBADMIN);

        if (admins.isEmpty() && subAdmins.isEmpty()) return;

        AlertSummary summary = buildAlertSummary();

        if (!summary.hasAlerts()) {
            log.info("Daily alert check: no alerts to send.");
            return;
        }

        for (User admin : admins) {
            sendAlertEmail(admin, summary);
        }
        for (User subAdmin : subAdmins) {
            sendAlertEmail(subAdmin, summary);
        }
    }

    
    public void checkAndAlertLowStock(MaterialStock stock) {
        if (stock.getMinimumThreshold() == null || stock.getQuantity() == null) return;
        int available = stock.getQuantity()
                - (stock.getReservedQuantity() != null ? stock.getReservedQuantity() : 0);
        if (available > stock.getMinimumThreshold()) return;

        List<User> admins = userRepository.findByRole(Roles.ADMIN);
        List<User> subAdmins = userRepository.findByRole(Roles.SUBADMIN);

        String subject = "⚠ Low Stock Alert — " + stock.getName();
        String body = buildLowStockInstantEmail(stock);

        log.info("Low stock alert for {}: physical={}, reserved={}, available={}, threshold={}",
                stock.getName(), stock.getQuantity(),
                stock.getReservedQuantity(), available, stock.getMinimumThreshold());

        for (User u : admins) emailService.sendRawAlert(u.getEmail(), subject, body);
        for (User u : subAdmins) emailService.sendRawAlert(u.getEmail(), subject, body);
    }

    

    private AlertSummary buildAlertSummary() {
        LocalDateTime now = LocalDateTime.now();

        
        List<MaterialStock> lowMaterialStock = materialStockRepository.findAll().stream()
                .filter(s -> s.getMinimumThreshold() != null && s.getQuantity() != null)
                .filter(s -> {
                    int available = s.getQuantity()
                            - (s.getReservedQuantity() != null ? s.getReservedQuantity() : 0);
                    return available <= s.getMinimumThreshold();
                })
                .collect(Collectors.toList());

        List<Task> overdueTasks = taskRepository.findAll().stream()
                .filter(t -> t.getPlannedEnd() != null
                        && t.getPlannedEnd().isBefore(now)
                        && t.getStatus() != TaskStatus.COMPLETED
                        && t.getStatus() != TaskStatus.CANCELLED)
                .collect(Collectors.toList());



        List<MaterialOrder> stalePendingOrders = materialOrderRepository.findAll().stream()
                .filter(o -> o.getStatus() == MaterialOrderStatus.PENDING
                        && o.getCreatedAt() != null
                        && o.getCreatedAt().isBefore(now.minusDays(3)))
                .collect(Collectors.toList());

        
        List<Production> stalledProductions = productionRepository.findAll().stream()
                .filter(p -> p.getStatus() == ProductionStatus.IN_PROGRESS
                        && p.getCreatedAt() != null
                        && p.getCreatedAt().isBefore(now.minusDays(5)))
                .collect(Collectors.toList());

        return new AlertSummary(lowMaterialStock, overdueTasks, stalePendingOrders, stalledProductions);
    }

    private void sendAlertEmail(User user, AlertSummary s) {
        emailService.sendRawAlert(user.getEmail(), buildSubject(s), buildBody(s));
    }

    private String buildSubject(AlertSummary s) {
        int total = s.totalAlerts();
        return "⚠ SmartTex DPP — " + total + " alert" + (total > 1 ? "s" : "") + " require your attention";
    }

    private String buildBody(AlertSummary s) {
        StringBuilder sections = new StringBuilder();

        if (!s.lowMaterialStock().isEmpty()) {
            sections.append(section(
                "#ef4444", "📦 Low Material Stock (" + s.lowMaterialStock().size() + ")",
                tableRows(s.lowMaterialStock().stream().map(m ->
                        row(m.getName(), m.getReferenceCode() != null ? m.getReferenceCode() : "—",
                                m.getQuantity() + " / " + m.getMinimumThreshold() + " " + (m.getUnit() != null ? m.getUnit() : ""),
                                "Critical")).toList())
            ));
        }

        if (!s.overdueTasks().isEmpty()) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");
            sections.append(section(
                "#8b5cf6", "⏰ Overdue Tasks (" + s.overdueTasks().size() + ")",
                tableRows(s.overdueTasks().stream().map(t ->
                        row(t.getTitle(), t.getStatus().name(),
                                t.getPlannedEnd().format(fmt),
                                t.getPriority() != null ? t.getPriority().name() : "—")).toList())
            ));
        }

        if (!s.stalePendingOrders().isEmpty()) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");
            sections.append(section(
                "#0ea5e9", "🛒 Pending Orders (3+ days) (" + s.stalePendingOrders().size() + ")",
                tableRows(s.stalePendingOrders().stream().map(o ->
                        row(o.getOrderNumber(), o.getSupplierId(),
                                o.getCreatedAt().format(fmt),
                                "Pending")).toList())
            ));
        }

        if (!s.stalledProductions().isEmpty()) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");
            sections.append(section(
                "#f59e0b", "🏭 Stalled Productions (5+ days) (" + s.stalledProductions().size() + ")",
                tableRows(s.stalledProductions().stream().map(p ->
                        row(p.getProductId() != null ? p.getProductId() : p.getId(),
                                "Qty: " + p.getQuantity(),
                                p.getCreatedAt().format(fmt),
                                "In Progress")).toList())
            ));
        }

        return wrapEmail(sections.toString());
    }

    private String buildLowStockInstantEmail(MaterialStock stock) {
        int physical = stock.getQuantity() != null ? stock.getQuantity() : 0;
        int reserved = stock.getReservedQuantity() != null ? stock.getReservedQuantity() : 0;
        int available = Math.max(0, physical - reserved);
        String body = "<p style='font-size:14px;color:#475569;line-height:1.6'>Material <strong>"
                + htmlEscape(stock.getName()) + "</strong> has <strong style='color:#ef4444'>"
                + available + " " + (stock.getUnit() != null ? htmlEscape(stock.getUnit()) : "units")
                + " available</strong> (physical: " + physical + ", reserved: " + reserved
                + "), which is at or below the minimum threshold of <strong>"
                + stock.getMinimumThreshold() + "</strong>.</p>"
                + "<p style='font-size:13px;color:#64748b;margin-top:8px'>Please create a purchase order to replenish this material.</p>"
                + "<div style='margin-top:20px'><a href='http://localhost:3000/supply-chain' "
                + "style='display:inline-block;background:#4d7aff;color:#fff;font-size:13px;font-weight:700;"
                + "text-decoration:none;padding:12px 24px;border-radius:10px'>Create Purchase Order</a></div>";
        return wrapEmail("<div style='border-left:4px solid #ef4444;padding:16px 20px;background:#fef2f2;border-radius:0 12px 12px 0;margin-bottom:24px'>"
                + "<h3 style='margin:0 0 8px;font-size:15px;color:#ef4444'>Low Stock Alert</h3>"
                + body + "</div>");
    }

    

    private String section(String color, String title, String tableContent) {
        return "<div style='margin-bottom:24px'>"
                + "<h3 style='margin:0 0 10px;font-size:14px;font-weight:700;color:" + color + "'>" + title + "</h3>"
                + "<table style='width:100%;border-collapse:collapse;font-size:12px'>"
                + "<thead><tr style='background:#f8fafc'>"
                + "<th style='padding:7px 10px;text-align:left;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0'>Name</th>"
                + "<th style='padding:7px 10px;text-align:left;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0'>Detail</th>"
                + "<th style='padding:7px 10px;text-align:left;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0'>Value</th>"
                + "<th style='padding:7px 10px;text-align:left;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0'>Status</th>"
                + "</tr></thead><tbody>" + tableContent + "</tbody></table></div>";
    }

    private String tableRows(List<String> rows) {
        return String.join("", rows);
    }

    private String row(String col1, String col2, String col3, String col4) {
        return "<tr style='border-bottom:1px solid #f1f5f9'>"
                + "<td style='padding:7px 10px;color:#334155;font-weight:500'>" + htmlEscape(col1) + "</td>"
                + "<td style='padding:7px 10px;color:#64748b'>" + htmlEscape(col2) + "</td>"
                + "<td style='padding:7px 10px;color:#64748b'>" + htmlEscape(col3) + "</td>"
                + "<td style='padding:7px 10px;color:#64748b'>" + htmlEscape(col4) + "</td>"
                + "</tr>";
    }

    private String wrapEmail(String content) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
                + "<body style='margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif'>"
                + "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:40px 16px'>"
                + "<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%'>"
                + "<tr><td style='background:#4d7aff;border-radius:16px 16px 0 0;padding:20px 28px'>"
                + "<span style='color:#fff;font-size:18px;font-weight:800'>SmartTex DPP</span>"
                + "<span style='color:rgba(255,255,255,0.6);font-size:12px;margin-left:8px'>Daily Alert Report · "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + "</span>"
                + "</td></tr>"
                + "<tr><td style='background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px'>"
                + content
                + "<div style='margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9'>"
                + "<a href='http://localhost:3000/dashboard' style='display:inline-block;background:#4d7aff;color:#fff;"
                + "font-size:13px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px'>Open Dashboard</a>"
                + "</div>"
                + "<p style='margin:16px 0 0;font-size:11px;color:#94a3b8'>You receive this because you are an Admin or SubAdmin on SmartTex DPP.</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    private static String htmlEscape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    record AlertSummary(
            List<MaterialStock> lowMaterialStock,
            List<Task> overdueTasks,
            List<MaterialOrder> stalePendingOrders,
            List<Production> stalledProductions
    ) {
        boolean hasAlerts() { return totalAlerts() > 0; }
        int totalAlerts() {
            return lowMaterialStock.size() + overdueTasks.size()
                    + stalePendingOrders.size() + stalledProductions.size();
        }
    }
}
