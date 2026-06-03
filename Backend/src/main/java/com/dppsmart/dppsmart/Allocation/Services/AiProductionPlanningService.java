package com.dppsmart.dppsmart.Allocation.Services;

import com.dppsmart.dppsmart.Allocation.DTO.ProductionPlanningDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AiProductionPlanningService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public ProductionPlanningDTO.AiRecommendationDTO recommend(List<ProductionPlanningDTO.OrderPlanDTO> orders) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Groq API key not configured — skipping AI recommendation");
            return null;
        }

        try {
            String summary = buildSummary(orders);

            String systemPrompt = "You are a production planning assistant for a manufacturing ERP.\n" +
                    "Given a list of orders with their material availability simulation, recommend which order to produce first.\n" +
                    "You MUST respond with ONLY valid JSON in exactly this format (no markdown, no explanation outside JSON):\n" +
                    "{\n" +
                    "  \"recommendedOrderId\": \"...\",\n" +
                    "  \"recommendedOrderCode\": \"...\",\n" +
                    "  \"recommendation\": \"...\",\n" +
                    "  \"reason\": \"...\",\n" +
                    "  \"risk\": \"...\",\n" +
                    "  \"priority\": \"HIGH|MEDIUM|LOW\"\n" +
                    "}\n" +
                    "Use only the data provided. Do not invent numbers.";

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", summary);

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", systemPrompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(systemMessage, userMessage));
            requestBody.put("temperature", 0.2);
            requestBody.put("max_tokens", 512);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseGroqResponse(response.getBody());
            } else {
                log.warn("Groq returned non-2xx status: {}", response.getStatusCode());
                return null;
            }

        } catch (Exception e) {
            log.warn("AI recommendation failed: {}", e.getMessage());
            return null;
        }
    }

    private String buildSummary(List<ProductionPlanningDTO.OrderPlanDTO> orders) {
        StringBuilder sb = new StringBuilder();
        sb.append("Orders for production planning:\n\n");

        for (ProductionPlanningDTO.OrderPlanDTO order : orders) {
            sb.append("Order ID: ").append(order.getOrderId()).append("\n");
            sb.append("Order Code: ").append(order.getOrderCode()).append("\n");
            sb.append("Status: ").append(order.getStatus()).append("\n");
            if (order.getRequestedDeliveryDate() != null) {
                sb.append("Requested Delivery: ").append(order.getRequestedDeliveryDate()).append("\n");
            }
            if (order.getConfirmedDeliveryDate() != null) {
                sb.append("Confirmed Delivery: ").append(order.getConfirmedDeliveryDate()).append("\n");
            }
            sb.append("Items:\n");

            if (order.getItems() != null) {
                for (ProductionPlanningDTO.ItemPlanDTO item : order.getItems()) {
                    sb.append("  - Product: ").append(item.getProductName())
                            .append(", Ordered: ").append(item.getOrderedQuantity())
                            .append(", Remaining: ").append(item.getRemainingToProduce())
                            .append(", Producible now: ").append(item.getProducibleQuantityNow())
                            .append(", Status: ").append(item.getProductionStatus())
                            .append("\n");

                    if (item.getMaterials() != null && !item.getMaterials().isEmpty()) {
                        sb.append("    Materials:\n");
                        for (ProductionPlanningDTO.MaterialSimDTO mat : item.getMaterials()) {
                            sb.append("      * ").append(mat.getMaterialName())
                                    .append(": available=").append(mat.getAvailableInStock())
                                    .append(", needed=").append(mat.getNeededForFullOrder())
                                    .append(", missing=").append(mat.getMissingAfterThisProduction())
                                    .append(", limiting=").append(mat.isLimitingMaterial())
                                    .append("\n");
                        }
                    }
                }
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private ProductionPlanningDTO.AiRecommendationDTO parseGroqResponse(Map<?, ?> responseBody) {
        try {
            Object choicesObj = responseBody.get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                log.warn("Groq response has no choices");
                return null;
            }
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> choiceMap)) return null;
            Object msgObj = choiceMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) return null;
            Object contentObj = msgMap.get("content");
            if (contentObj == null) return null;

            String content = contentObj.toString().trim();

            if (content.startsWith("```")) {
                content = content.replaceAll("(?s)```[a-zA-Z]*\\n?", "").replaceAll("```", "").trim();
            }

            content = content.trim();
            if (!content.startsWith("{")) {
                log.warn("AI response content is not JSON: {}", content);
                return null;
            }

            return ProductionPlanningDTO.AiRecommendationDTO.builder()
                    .recommendedOrderId(extractJsonString(content, "recommendedOrderId"))
                    .recommendedOrderCode(extractJsonString(content, "recommendedOrderCode"))
                    .recommendation(extractJsonString(content, "recommendation"))
                    .reason(extractJsonString(content, "reason"))
                    .risk(extractJsonString(content, "risk"))
                    .priority(extractJsonString(content, "priority"))
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse Groq AI response: {}", e.getMessage());
            return null;
        }
    }

    private String extractJsonString(String json, String key) {

        String pattern = "\"" + key + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"";
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1).replace("\\\"", "\"").replace("\\\\", "\\");
        }
        return null;
    }
}
