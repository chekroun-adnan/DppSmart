package com.dppsmart.dppsmart.Orders.Services;

import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.MaterialRequirement;
import com.dppsmart.dppsmart.Orders.DTO.BulkOrderRequirementResponseDTO.ProductSummary;
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
public class GroqBulkSummaryService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SYSTEM_PROMPT =
            "You are a manufacturing operations assistant for a textile/apparel production facility. " +
            "Provide a concise 2-3 sentence summary of bulk order production requirements for the production manager. " +
            "Be direct and factual. Do NOT invent quantities — they are provided. " +
            "Focus on what needs to be produced, what materials are short, and overall feasibility.";

    public String generateSummary(int orderCount,
                                  List<ProductSummary> productSummaries,
                                  List<MaterialRequirement> aggregatedMaterials) {
        try {
            long productsNeedingProduction = productSummaries.stream()
                    .filter(p -> !p.isStockSufficient()).count();
            long insufficientMaterials = aggregatedMaterials.stream()
                    .filter(m -> "INSUFFICIENT".equals(m.getStatus())).count();

            String productsDetail = productSummaries.stream()
                    .filter(p -> !p.isStockSufficient())
                    .map(p -> p.getProductName() + " (produce " + p.getMissingQuantityToProduce() + ")")
                    .collect(Collectors.joining(", "));

            String materialsDetail = aggregatedMaterials.stream()
                    .filter(m -> "INSUFFICIENT".equals(m.getStatus()))
                    .map(m -> m.getMaterialName() + " (missing " + m.getMissingQuantity() + " " + m.getUnit() + ")")
                    .collect(Collectors.joining(", "));

            String userMessage = String.format(
                    "Bulk order analysis for %d orders. %d product(s) need production: %s. " +
                    "%d raw material(s) are insufficient: %s. %d material(s) are fully available.",
                    orderCount, productsNeedingProduction,
                    productsDetail.isEmpty() ? "none — all covered by stock" : productsDetail,
                    insufficientMaterials,
                    materialsDetail.isEmpty() ? "none" : materialsDetail,
                    aggregatedMaterials.size() - insufficientMaterials
            );

            if (apiKey == null || apiKey.isBlank()) {
                log.warn("Groq API key not configured — skipping AI summary");
                return "AI summary unavailable. Review the tables manually.";
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
                return "AI summary unavailable. Review the tables manually.";
            }

            Object choicesObj = response.getBody().get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                return "AI summary unavailable. Review the tables manually.";
            }
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                return "AI summary unavailable. Review the tables manually.";
            }
            Object msgObj = firstMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) {
                return "AI summary unavailable. Review the tables manually.";
            }
            Object content = msgMap.get("content");
            return content == null ? "AI summary unavailable. Review the tables manually." : content.toString();

        } catch (Exception e) {
            log.warn("Groq bulk summary failed: {}", e.getMessage());
            return "AI summary unavailable. Review the tables manually.";
        }
    }
}
