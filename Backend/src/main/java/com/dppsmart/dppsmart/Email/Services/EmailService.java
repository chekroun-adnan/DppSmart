package com.dppsmart.dppsmart.Email.Services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private static final String FROM = "SmartTex DPP <noreply@smarttex.dpp>";
    private static final String BRAND = "#4d7aff";

    private static final Map<String, String> EN_STRINGS = Map.of(
        "order_received_heading", "We received your order!",
        "order_received_btn", "View My Orders",
        "order_confirmed_heading", "Order Confirmed!",
        "order_confirmed_btn", "View Order",
        "date_proposed_heading", "Delivery Date Change Requested",
        "date_proposed_btn", "View & Respond",
        "order_ready_heading", "Order Ready for Delivery!",
        "order_ready_btn", "View Order",
        "order_delivered_heading", "Order Successfully Delivered",
        "order_delivered_btn", "View All Orders"
    );

    private static final Map<String, String> FR_STRINGS = Map.of(
        "order_received_heading", "Nous avons reçu votre commande !",
        "order_received_btn", "Voir mes commandes",
        "order_confirmed_heading", "Commande confirmée !",
        "order_confirmed_btn", "Voir la commande",
        "date_proposed_heading", "Changement de date de livraison",
        "date_proposed_btn", "Voir et répondre",
        "order_ready_heading", "Commande prête à livrer !",
        "order_ready_btn", "Voir la commande",
        "order_delivered_heading", "Commande livrée avec succès",
        "order_delivered_btn", "Voir toutes les commandes"
    );

    private static final Map<String, String> AR_STRINGS = Map.of(
        "order_received_heading", "تم استلام طلبك!",
        "order_received_btn", "عرض طلباتي",
        "order_confirmed_heading", "تم تأكيد الطلب!",
        "order_confirmed_btn", "عرض الطلب",
        "date_proposed_heading", "طلب تغيير موعد التسليم",
        "date_proposed_btn", "عرض والرد",
        "order_ready_heading", "الطلب جاهز للتسليم!",
        "order_ready_btn", "عرض الطلب",
        "order_delivered_heading", "تم تسليم الطلب بنجاح",
        "order_delivered_btn", "عرض جميع الطلبات"
    );

    private String t(String lang, String key) {
        return switch (lang != null ? lang.toLowerCase() : "en") {
            case "fr" -> FR_STRINGS.getOrDefault(key, key);
            case "ar" -> AR_STRINGS.getOrDefault(key, key);
            default   -> EN_STRINGS.getOrDefault(key, key);
        };
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String displayName, boolean isOAuth) {
        try {
            String subject = "Welcome to SmartTex DPP!";
            String body = baseTemplate(
                "Welcome, " + htmlEscape(displayName) + "!",
                isOAuth
                    ? "Your account has been created via Google. You can now access the SmartTex DPP platform."
                    : "Your account has been created successfully. You can now sign in with your email and password.",
                "Access Dashboard",
                "http://localhost:3000/dashboard",
                ""
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderConfirmation(String toEmail, String orderNumber, String supplierName,
                                       List<OrderItemSummary> items, String orgName) {
        try {
            String subject = "Purchase Order Confirmed — " + orderNumber;
            StringBuilder rows = new StringBuilder();
            for (OrderItemSummary item : items) {
                rows.append("<tr>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155'>").append(htmlEscape(item.materialName())).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right'>").append(item.quantity()).append(" ").append(htmlEscape(item.unit())).append("</td>")
                    .append("</tr>");
            }
            String details = "<table style='width:100%;border-collapse:collapse;margin-top:12px'>"
                + "<thead><tr>"
                + "<th style='padding:8px 12px;background:#f8fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;text-align:left'>Material</th>"
                + "<th style='padding:8px 12px;background:#f8fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;text-align:right'>Quantity</th>"
                + "</tr></thead><tbody>" + rows + "</tbody></table>";
            String body = baseTemplate(
                "Order Confirmed",
                "Purchase order <strong>" + htmlEscape(orderNumber) + "</strong> with supplier <strong>" + htmlEscape(supplierName) + "</strong> for <strong>" + htmlEscape(orgName) + "</strong> has been created.",
                "View Order",
                "http://localhost:3000/supply-chain",
                details
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order confirmation to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendDateChangeNotification(String toEmail, String orderNumber,
                                           String oldDate, String newDate, String reason) {
        try {
            String subject = "Delivery Date Changed — " + orderNumber;
            String body = baseTemplate(
                "Delivery Date Update Required",
                "The delivery date for your order <strong>" + htmlEscape(orderNumber) + "</strong> needs to be changed.",
                "Review Order",
                "http://localhost:3000/client-orders/" + orderNumber,
                "<table style='width:100%;border-collapse:collapse;margin-top:16px'>"
                    + "<tr><td style='padding:12px;background:#fef2f2;border-radius:8px' colspan='2'>"
                    + "<p style='margin:0;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em'>What Changed</p>"
                    + "<div style='display:flex;align-items:center;gap:16px;margin-top:8px'>"
                    + "<div><p style='margin:0;font-size:10px;color:#dc2626;text-transform:uppercase'>Old Date</p><p style='margin:4px 0 0;font-size:16px;font-weight:700;color:#991b1b'>" + htmlEscape(oldDate) + "</p></div>"
                    + "<div style='color:#94a3b8;font-size:20px'>→</div>"
                    + "<div><p style='margin:0;font-size:10px;color:#16a34a;text-transform:uppercase'>New Date</p><p style='margin:4px 0 0;font-size:16px;font-weight:700;color:#15803d'>" + htmlEscape(newDate) + "</p></div>"
                    + "</div>"
                    + "</td></tr>"
                    + "<tr><td style='padding:16px 12px' colspan='2'>"
                    + "<p style='margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em'>Reason</p>"
                    + "<p style='margin:0;font-size:13px;color:#334155;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0'>" + htmlEscape(reason) + "</p>"
                    + "</td></tr>"
                + "</table>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send date change notification to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderConfirmedToClient(String toEmail, String orderNumber, String confirmedDate, String clientName) {
        sendOrderConfirmedToClient(toEmail, orderNumber, confirmedDate, clientName, null);
    }

    @Async
    public void sendOrderConfirmedToClient(String toEmail, String orderNumber, String confirmedDate, String clientName, String lang) {
        try {
            String subject = "Order Confirmed — " + orderNumber;
            String body = baseTemplate(
                t(lang, "order_confirmed_heading"),
                "Great news, <strong>" + htmlEscape(clientName) + "</strong>! Your order <strong>" + htmlEscape(orderNumber) + "</strong> has been confirmed. Delivery is scheduled for <strong>" + htmlEscape(confirmedDate) + "</strong>.",
                t(lang, "order_confirmed_btn"),
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.08em'>Delivery Date</p>"
                    + "<p style='margin:8px 0 0;font-size:24px;font-weight:800;color:#15803d'>" + htmlEscape(confirmedDate) + "</p>"
                    + "</div>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order confirmation to client {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderCancelledToClient(String toEmail, String orderNumber, String reason, String clientName) {
        sendOrderCancelledToClient(toEmail, orderNumber, reason, clientName, null);
    }

    @Async
    public void sendOrderCancelledToClient(String toEmail, String orderNumber, String reason, String clientName, String lang) {
        try {
            String subject = "Order Cancelled — " + orderNumber;
            String body = baseTemplate(
                "Order Cancelled",
                "We're sorry, <strong>" + htmlEscape(clientName) + "</strong>. Your order <strong>" + htmlEscape(orderNumber) + "</strong> has been cancelled by the admin.",
                "View Orders",
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px'>"
                    + "<p style='margin:0 0 8px;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em'>Reason</p>"
                    + "<p style='margin:0;font-size:14px;color:#7f1d1d;line-height:1.6'>" + htmlEscape(reason) + "</p>"
                    + "</div>"
                    + "<p style='margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.5'>If you have questions or concerns, please contact support.</p>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order cancellation to client {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendSupplierNotification(String toEmail, String orderNumber, String confirmedDate, String clientName) {
        try {
            String subject = "Order Confirmed — " + orderNumber;
            String body = baseTemplate(
                "Order Confirmed!",
                "Great news, <strong>" + htmlEscape(clientName) + "</strong>! Your order <strong>" + htmlEscape(orderNumber) + "</strong> has been confirmed. Delivery is scheduled for <strong>" + htmlEscape(confirmedDate) + "</strong>.",
                "View Order",
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.08em'>Delivery Date</p>"
                    + "<p style='margin:8px 0 0;font-size:24px;font-weight:800;color:#15803d'>" + htmlEscape(confirmedDate) + "</p>"
                    + "</div>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order confirmation to client {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendSupplierNotification(String supplierEmail, String orderNumber, String orgName,
                                          List<OrderItemSummary> items) {
        try {
            String subject = "New Purchase Order Received — " + orderNumber;
            StringBuilder itemList = new StringBuilder("<ul style='margin:12px 0;padding-left:20px'>");
            for (OrderItemSummary item : items) {
                itemList.append("<li style='font-size:13px;color:#334155;margin-bottom:4px'>")
                        .append(htmlEscape(item.materialName()))
                        .append(" — ").append(item.quantity()).append(" ").append(htmlEscape(item.unit()))
                        .append("</li>");
            }
            itemList.append("</ul>");
            String body = baseTemplate(
                "New Purchase Order",
                "You have received a new purchase order <strong>" + htmlEscape(orderNumber) + "</strong> from <strong>" + htmlEscape(orgName) + "</strong>. Please review and confirm the order.",
                "Acknowledge",
                "#",
                itemList.toString()
            );
            send(supplierEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send supplier notification to {}: {}", supplierEmail, e.getMessage());
        }
    }

    @Async
    public void sendDeliveryUpdate(String toEmail, String orderNumber, String newStatus, String trackingNumber) {
        try {
            String subject = "Delivery Update — " + orderNumber;
            String statusLabel = newStatus.replace("_", " ");
            String extra = trackingNumber != null
                ? "<p style='margin:12px 0 0;font-size:12px;color:#64748b'>Tracking number: <strong style='color:#334155'>" + htmlEscape(trackingNumber) + "</strong></p>"
                : "";
            String body = baseTemplate(
                "Delivery Status Updated",
                "Purchase order <strong>" + htmlEscape(orderNumber) + "</strong> status has changed to <strong style='color:" + BRAND + "'>" + htmlEscape(statusLabel) + "</strong>.",
                "Track Order",
                "http://localhost:3000/supply-chain",
                extra
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send delivery update to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendMismatchAlert(String supplierEmail, String orderNumber, List<MismatchItem> mismatches, String decision) {
        try {
            String subject = "Quantity Mismatch Alert — " + orderNumber;
            StringBuilder rows = new StringBuilder();
            for (MismatchItem m : mismatches) {
                String color = m.rejectedQty() > 0 ? "#ef4444" : "#22c55e";
                rows.append("<tr>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155'>").append(htmlEscape(m.materialName())).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right'>").append(m.orderedQty()).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:right'>").append(m.receivedQty()).append("</td>")
                    .append("<td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:").append(color).append("'>").append(m.rejectedQty()).append("</td>")
                    .append("</tr>");
            }
            String table = "<table style='width:100%;border-collapse:collapse;margin-top:12px'>"
                + "<thead><tr>"
                + "<th style='padding:8px 12px;background:#fef2f2;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;text-align:left'>Material</th>"
                + "<th style='padding:8px 12px;background:#fef2f2;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;text-align:right'>Ordered</th>"
                + "<th style='padding:8px 12px;background:#fef2f2;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;text-align:right'>Received</th>"
                + "<th style='padding:8px 12px;background:#fef2f2;font-size:11px;font-weight:700;text-transform:uppercase;color:#ef4444;text-align:right'>Rejected</th>"
                + "</tr></thead><tbody>" + rows + "</tbody></table>";
            String decisionLabel = "APPROVED".equalsIgnoreCase(decision) ? "partially approved" : "rejected";
            String body = baseTemplate(
                "⚠ Quantity Mismatch Detected",
                "Order <strong>" + htmlEscape(orderNumber) + "</strong> has been <strong>" + decisionLabel + "</strong> due to quantity discrepancies. Please review the details below.",
                "Contact Support",
                "#",
                table
            );
            send(supplierEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send mismatch alert to {}: {}", supplierEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderSubmittedToClient(String toEmail, String orderNumber, String clientName,
                                            String requestedDate, java.util.List<String> productLines) {
        sendOrderSubmittedToClient(toEmail, orderNumber, clientName, requestedDate, productLines, null);
    }

    @Async
    public void sendOrderSubmittedToClient(String toEmail, String orderNumber, String clientName,
                                            String requestedDate, java.util.List<String> productLines, String lang) {
        try {
            String subject = "Order Received — " + orderNumber;
            StringBuilder items = new StringBuilder("<ul style='margin:12px 0;padding-left:20px'>");
            for (String line : productLines) {
                items.append("<li style='font-size:13px;color:#334155;margin-bottom:4px'>").append(htmlEscape(line)).append("</li>");
            }
            items.append("</ul>");
            String body = baseTemplate(
                t(lang, "order_received_heading"),
                "Hi <strong>" + htmlEscape(clientName) + "</strong>, your order <strong>" + htmlEscape(orderNumber) + "</strong> has been received and is under review. We'll notify you once it's confirmed.",
                t(lang, "order_received_btn"),
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px'>"
                    + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em'>Requested Delivery</p>"
                    + "<p style='margin:0;font-size:16px;font-weight:700;color:#1e40af'>" + htmlEscape(requestedDate) + "</p>"
                    + "</div>"
                    + "<div style='margin-top:12px'><p style='margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em'>Items Ordered</p>"
                    + items + "</div>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order submitted email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendDateProposedToClient(String toEmail, String orderNumber, String clientName,
                                          String originalDate, String proposedDate, String adminMessage) {
        sendDateProposedToClient(toEmail, orderNumber, clientName, originalDate, proposedDate, adminMessage, null);
    }

    @Async
    public void sendDateProposedToClient(String toEmail, String orderNumber, String clientName,
                                          String originalDate, String proposedDate, String adminMessage, String lang) {
        try {
            String subject = "New Delivery Date Proposed — " + orderNumber;
            String msgBlock = (adminMessage != null && !adminMessage.isBlank())
                ? "<div style='margin-top:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px'>"
                    + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase'>Message from Admin</p>"
                    + "<p style='margin:0;font-size:13px;color:#334155;line-height:1.6'>" + htmlEscape(adminMessage) + "</p>"
                    + "</div>"
                : "";
            String body = baseTemplate(
                t(lang, "date_proposed_heading"),
                "Hi <strong>" + htmlEscape(clientName) + "</strong>, we need to propose a new delivery date for your order <strong>" + htmlEscape(orderNumber) + "</strong>. Please review and accept or reject.",
                t(lang, "date_proposed_btn"),
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px'>"
                    + "<div style='display:flex;gap:24px;flex-wrap:wrap'>"
                    + "<div><p style='margin:0;font-size:10px;color:#dc2626;text-transform:uppercase;font-weight:700'>Original Date</p>"
                    + "<p style='margin:6px 0 0;font-size:16px;font-weight:700;color:#991b1b;text-decoration:line-through'>" + htmlEscape(originalDate) + "</p></div>"
                    + "<div style='color:#94a3b8;align-self:flex-end;font-size:20px;padding-bottom:4px'>→</div>"
                    + "<div><p style='margin:0;font-size:10px;color:#16a34a;text-transform:uppercase;font-weight:700'>Proposed Date</p>"
                    + "<p style='margin:6px 0 0;font-size:16px;font-weight:700;color:#15803d'>" + htmlEscape(proposedDate) + "</p></div>"
                    + "</div>"
                    + "</div>"
                    + msgBlock
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send date proposal email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderReadyToClient(String toEmail, String orderNumber, String clientName, String confirmedDate) {
        sendOrderReadyToClient(toEmail, orderNumber, clientName, confirmedDate, null);
    }

    @Async
    public void sendOrderReadyToClient(String toEmail, String orderNumber, String clientName, String confirmedDate, String lang) {
        try {
            String subject = "Your Order is Ready — " + orderNumber;
            String body = baseTemplate(
                t(lang, "order_ready_heading"),
                "Great news, <strong>" + htmlEscape(clientName) + "</strong>! Your order <strong>" + htmlEscape(orderNumber) + "</strong> has been produced and is ready. Please arrange pickup or delivery.",
                t(lang, "order_ready_btn"),
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:28px'>✅</p>"
                    + "<p style='margin:8px 0 0;font-size:14px;font-weight:700;color:#15803d'>Production Complete</p>"
                    + (confirmedDate != null && !confirmedDate.isBlank()
                        ? "<p style='margin:4px 0 0;font-size:12px;color:#166534'>Scheduled delivery: <strong>" + htmlEscape(confirmedDate) + "</strong></p>"
                        : "")
                    + "</div>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send order ready email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderDeliveredToClient(String toEmail, String orderNumber, String clientName) {
        sendOrderDeliveredToClient(toEmail, orderNumber, clientName, null);
    }

    @Async
    public void sendOrderDeliveredToClient(String toEmail, String orderNumber, String clientName, String lang) {
        try {
            String subject = "Order Delivered — " + orderNumber;
            String body = baseTemplate(
                t(lang, "order_delivered_heading"),
                "Hi <strong>" + htmlEscape(clientName) + "</strong>, your order <strong>" + htmlEscape(orderNumber) + "</strong> has been marked as delivered. Thank you for your business!",
                t(lang, "order_delivered_btn"),
                "http://localhost:3000/client-orders",
                "<div style='margin-top:16px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:32px'>📦</p>"
                    + "<p style='margin:8px 0 0;font-size:14px;font-weight:700;color:#15803d'>Delivery Confirmed</p>"
                    + "<p style='margin:4px 0 0;font-size:12px;color:#166534'>We hope to work with you again soon.</p>"
                    + "</div>"
            );
            send(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send delivered email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendClientAcceptedDateToAdmin(String toEmail, String orderNumber, String clientName,
                                               String acceptedDate, String clientMessage) {
        try {
            String msgBlock = (clientMessage != null && !clientMessage.isBlank())
                ? "<div style='margin-top:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px'>"
                    + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase'>Client Message</p>"
                    + "<p style='margin:0;font-size:13px;color:#334155;line-height:1.6'>" + htmlEscape(clientMessage) + "</p>"
                    + "</div>"
                : "";
            String body = baseTemplate(
                "Client Accepted the New Date",
                "Client <strong>" + htmlEscape(clientName) + "</strong> has <strong style='color:#16a34a'>accepted</strong> the proposed delivery date for order <strong>" + htmlEscape(orderNumber) + "</strong>. You can now confirm and proceed.",
                "View Order",
                "http://localhost:3000/orders",
                "<div style='margin-top:16px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.08em'>Accepted Date</p>"
                    + "<p style='margin:8px 0 0;font-size:22px;font-weight:800;color:#15803d'>" + htmlEscape(acceptedDate) + "</p>"
                    + "</div>"
                    + msgBlock
            );
            send(toEmail, "Client Accepted Date — " + orderNumber, body);
        } catch (Exception e) {
            log.warn("Failed to send client-accepted email to admin {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendClientRejectedDateToAdmin(String toEmail, String orderNumber, String clientName,
                                               String proposedDate, String clientMessage) {
        try {
            String msgBlock = (clientMessage != null && !clientMessage.isBlank())
                ? "<div style='margin-top:12px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px'>"
                    + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase'>Client Reason</p>"
                    + "<p style='margin:0;font-size:13px;color:#7f1d1d;line-height:1.6'>" + htmlEscape(clientMessage) + "</p>"
                    + "</div>"
                : "";
            String body = baseTemplate(
                "Client Rejected the New Date",
                "Client <strong>" + htmlEscape(clientName) + "</strong> has <strong style='color:#dc2626'>rejected</strong> the proposed delivery date for order <strong>" + htmlEscape(orderNumber) + "</strong>. Please contact the client to agree on a new date.",
                "View Order",
                "http://localhost:3000/orders",
                "<div style='margin-top:16px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;text-align:center'>"
                    + "<p style='margin:0;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em'>Rejected Date</p>"
                    + "<p style='margin:8px 0 0;font-size:20px;font-weight:800;color:#991b1b;text-decoration:line-through'>" + htmlEscape(proposedDate) + "</p>"
                    + "</div>"
                    + msgBlock
            );
            send(toEmail, "Client Rejected Date — " + orderNumber, body);
        } catch (Exception e) {
            log.warn("Failed to send client-rejected email to admin {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendRawAlert(String toEmail, String subject, String htmlBody) {
        try {
            send(toEmail, subject, htmlBody);
        } catch (Exception e) {
            log.warn("Failed to send alert to {}: {}", toEmail, e.getMessage());
        }
    }

    private void send(String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(FROM);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        mailSender.send(message);
        log.info("Email sent to {} — {}", to, subject);
    }

    private static String htmlEscape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private String baseTemplate(String heading, String body, String btnLabel, String btnUrl, String extra) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif'>"
            + "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:40px 16px'>"
            + "<table width='560' cellpadding='0' cellspacing='0' style='max-width:560px;width:100%'>"
            
            + "<tr><td style='background:" + BRAND + ";border-radius:16px 16px 0 0;padding:24px 32px;text-align:center'>"
            + "<span style='color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px'>SmartTex DPP</span>"
            + "</td></tr>"
            
            + "<tr><td style='background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none'>"
            + "<h2 style='margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a'>" + heading + "</h2>"
            + "<p style='margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6'>" + body + "</p>"
            + extra
            + (btnUrl.startsWith("http") ? "<div style='margin-top:24px'><a href='" + btnUrl + "' style='display:inline-block;background:" + BRAND + ";color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px'>" + btnLabel + "</a></div>" : "")
            + "<p style='margin:32px 0 0;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px'>"
            + "Sent " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")) + " · SmartTex DPP Platform</p>"
            + "</td></tr>"
            + "</table></td></tr></table>"
            + "</body></html>";
    }

    public record OrderItemSummary(String materialName, int quantity, String unit) {}
    public record MismatchItem(String materialName, int orderedQty, int receivedQty, int rejectedQty) {}
}
