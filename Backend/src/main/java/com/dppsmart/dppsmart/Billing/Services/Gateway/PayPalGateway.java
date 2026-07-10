package com.dppsmart.dppsmart.Billing.Services.Gateway;

import com.dppsmart.dppsmart.Billing.Entities.Invoice;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class PayPalGateway implements PaymentGateway {

    private final RestTemplate rest = new RestTemplate();

    @Value("${payment.paypal.client-id:}")
    private String clientId;

    @Value("${payment.paypal.client-secret:}")
    private String clientSecret;

    @Value("${payment.paypal.api-url:https://api-m.sandbox.paypal.com}")
    private String apiUrl;

    @Override
    public String getProviderName() {
        return "PAYPAL";
    }

    @Override
    public boolean supportsMethod(String method) {
        return "PAYPAL".equalsIgnoreCase(method);
    }

    @Override
    public PaymentSession createPaymentSession(Invoice invoice, String successUrl, String cancelUrl) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            log.warn("PayPal not configured — returning mock session");
            return mockSession(invoice, successUrl, cancelUrl);
        }

        try {
            String accessToken = getAccessToken();
            String orderId = createPayPalOrder(accessToken, invoice, successUrl, cancelUrl);
            String approvalUrl = getApprovalUrl(accessToken, orderId);
            return new PaymentSession(orderId, approvalUrl, null, orderId);
        } catch (Exception e) {
            log.warn("PayPal API error, falling back to mock: {}", e.getMessage());
            return mockSession(invoice, successUrl, cancelUrl);
        }
    }

    @Override
    public PaymentResult handleReturn(String sessionId, String gatewayResponse) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            return new PaymentResult(true, "MOCK_" + sessionId, null, "Mock payment approved");
        }
        try {
            String accessToken = getAccessToken();
            return capturePayPalOrder(accessToken, sessionId);
        } catch (Exception e) {
            log.warn("PayPal capture failed: {}", e.getMessage());
            return new PaymentResult(false, sessionId, null, "Capture failed: " + e.getMessage());
        }
    }

    private String getAccessToken() {
        HttpHeaders headers = new HttpHeaders();
        String auth = Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes());
        headers.set("Authorization", "Basic " + auth);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<String> entity = new HttpEntity<>("grant_type=client_credentials", headers);
        ResponseEntity<Map> response = rest.exchange(apiUrl + "/v1/oauth2/token", HttpMethod.POST, entity, Map.class);
        return (String) response.getBody().get("access_token");
    }

    private String createPayPalOrder(String token, Invoice invoice, String successUrl, String cancelUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        double total = invoice.getTotal() != null ? invoice.getTotal() : 0;
        String currency = invoice.getCurrency() != null ? invoice.getCurrency() : "MAD";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("intent", "CAPTURE");
        body.put("purchase_units", List.of(Map.of(
            "reference_id", invoice.getId(),
            "amount", Map.of("currency_code", currency, "value", String.format("%.2f", total))
        )));
        body.put("payment_source", Map.of("paypal", Map.of(
            "experience_context", Map.of(
                "return_url", successUrl,
                "cancel_url", cancelUrl
            )
        )));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = rest.exchange(apiUrl + "/v2/checkout/orders", HttpMethod.POST, entity, Map.class);
        return (String) response.getBody().get("id");
    }

    private String getApprovalUrl(String token, String orderId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = rest.exchange(apiUrl + "/v2/checkout/orders/" + orderId, HttpMethod.GET, entity, Map.class);
        Map<String, Object> body = response.getBody();

        if (body != null && body.get("links") instanceof List<?> links) {
            for (Object l : links) {
                if (l instanceof Map<?, ?> link && "payer-action".equals(link.get("rel"))) {
                    return (String) link.get("href");
                }
            }
        }
        throw new RuntimeException("No approval URL found for PayPal order " + orderId);
    }

    private PaymentResult capturePayPalOrder(String token, String orderId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = rest.exchange(
            apiUrl + "/v2/checkout/orders/" + orderId + "/capture",
            HttpMethod.POST, entity, Map.class
        );

        if (response.getStatusCode().is2xxSuccessful()) {
            return new PaymentResult(true, orderId, null, "Payment captured");
        }
        return new PaymentResult(false, orderId, null, "Capture failed");
    }

    private PaymentSession mockSession(Invoice invoice, String successUrl, String cancelUrl) {
        String mockId = "PAYPAL_MOCK_" + invoice.getId();
        return new PaymentSession(
            mockId,
            successUrl + "?session_id=" + mockId + "&status=success",
            null,
            mockId
        );
    }
}
