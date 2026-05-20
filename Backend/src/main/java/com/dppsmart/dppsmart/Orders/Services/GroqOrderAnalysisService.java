package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.Orders.DTO.MaterialRequirementDTO;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.TechnicalSheet;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class GroqOrderAnalysisService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SYSTEM_PROMPT =
            "You are a manufacturing operations assistant for a textile/apparel production facility. " +
            "Provide a concise 2-3 sentence summary of material shortage situations for the production manager. " +
            "Be direct and factual. Do NOT invent quantities — they are provided. Focus on what is missing and urgency.";

    public String generateSummary(Orders order, OrderItem item, int missingProductQty,
                                  TechnicalSheet sheet, List<MaterialRequirementDTO> requirements) {
        try {
            long insufficientCount = requirements.stream()
                    .filter(r -> "INSUFFICIENT".equals(r.getStatus()))
                    .count();
            String insufficientNames = requirements.stream()
                    .filter(r -> "INSUFFICIENT".equals(r.getStatus()))
                    .map(r -> r.getMaterialName() + " (need " + r.getRecommendedOrderQuantity() + " " + r.getUnit() + ")")
                    .collect(Collectors.joining(", "));
            boolean hasCrossRisk = requirements.stream()
                    .anyMatch(r -> r.getOtherOrdersShortfall() != null && r.getOtherOrdersShortfall() > 0);

            String userMessage = String.format(
                    "Order %s: %d units of '%s' ordered. Product stock insufficient — need to produce %d units. " +
                    "Technical sheet: '%s'. %d material(s) insufficient: %s. %s",
                    order.getOrderReference(), item.getQuantity(), item.getProductName(),
                    missingProductQty, sheet.getName(), insufficientCount,
                    insufficientNames.isEmpty() ? "none" : insufficientNames,
                    hasCrossRisk ? "Some materials are also needed by other active orders." : ""
            );

            if (apiKey == null || apiKey.isBlank()) {
                log.warn("Groq API key not configured — skipping AI summary");
                return "AI summary unavailable. Review the materials table manually.";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", userMessage)
            ));
            payload.put("temperature", 0.2);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().isError() || response.getBody() == null) {
                return "AI summary unavailable. Review the materials table manually.";
            }

            Object choicesObj = response.getBody().get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                return "AI summary unavailable. Review the materials table manually.";
            }
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                return "AI summary unavailable. Review the materials table manually.";
            }
            Object msgObj = firstMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) {
                return "AI summary unavailable. Review the materials table manually.";
            }
            Object content = msgMap.get("content");
            return content == null ? "AI summary unavailable. Review the materials table manually." : content.toString();

        } catch (Exception e) {
            log.warn("Groq summary failed: {}", e.getMessage());
            return "AI summary unavailable. Review the materials table manually.";
        }
    }
}
