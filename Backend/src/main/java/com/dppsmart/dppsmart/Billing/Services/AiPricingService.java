package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiPricingService {

    private final CostCalculationService costCalculationService;
    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private static final String PRICING_SYSTEM_PROMPT = """
            You are a pricing analyst for a textile manufacturing company. Your role is to suggest fair market selling prices for products based on their manufacturing cost and product information.
            
            Given the product name, materials, and manufacturing cost breakdown, suggest a retail selling price.
            
            Consider:
            - The manufacturing cost (materials + operations) as the baseline
            - Standard industry markup for textile products (typically 2x-5x cost depending on the product type)
            - The product's materials quality
            - Market positioning
            
            Return ONLY valid JSON in this exact format, no other text:
            {
              "suggestedUnitPrice": number,
              "currency": "MAD",
              "reasoning": "brief explanation of the pricing rationale"
            }
            
            The suggestedUnitPrice should be a reasonable market selling price, not the manufacturing cost.
            """;

    public AiPriceSuggestion suggestPrice(String productId) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallbackSuggestion(productId);
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));

        var cost = costCalculationService.calculateEstimatedUnitPrice(productId, product.getOrganizationId());

        String prompt = buildPrompt(product, cost);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", PRICING_SYSTEM_PROMPT),
                    Map.of("role", "user", "content", prompt)
            ));
            payload.put("temperature", 0.3);
            payload.put("response_format", Map.of("type", "json_object"));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().isError() || response.getBody() == null) {
                log.warn("Groq API returned error for AI pricing: {}", response.getStatusCode());
                return fallbackSuggestion(productId);
            }

            String content = extractContent(response.getBody());
            if (content == null || content.isBlank()) {
                return fallbackSuggestion(productId);
            }

            JsonNode json = objectMapper.readTree(content);
            double suggestedPrice = json.has("suggestedUnitPrice") ? json.get("suggestedUnitPrice").asDouble() : 0;
            String currency = json.has("currency") ? json.get("currency").asText() : "MAD";
            String reasoning = json.has("reasoning") ? json.get("reasoning").asText() : "";

            if (suggestedPrice <= 0) {
                return fallbackSuggestion(productId);
            }

            return new AiPriceSuggestion(suggestedPrice, currency, reasoning,
                    cost.estimatedUnitPrice(), cost.materialCostPerUnit(), cost.operationCostPerUnit());

        } catch (Exception e) {
            log.warn("AI pricing suggestion failed for product {}: {}", productId, e.getMessage());
            return fallbackSuggestion(productId);
        }
    }

    private AiPriceSuggestion fallbackSuggestion(String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found: " + productId));
        var cost = costCalculationService.calculateEstimatedUnitPrice(productId, product.getOrganizationId());
        double suggested = cost.estimatedUnitPrice() > 0 ? cost.estimatedUnitPrice() * 2.5 : 0;
        if (suggested == 0 && product.getDefaultUnitPrice() != null) {
            suggested = product.getDefaultUnitPrice();
        }
        String reasoning = cost.estimatedUnitPrice() > 0
                ? "AI unavailable. Estimated based on manufacturing cost ("
                + cost.materialCostPerUnit() + " materials + " + cost.operationCostPerUnit()
                + " operations) × 2.5 standard markup."
                : "AI unavailable. Using product default price.";
        return new AiPriceSuggestion(suggested, "MAD", reasoning,
                cost.estimatedUnitPrice(), cost.materialCostPerUnit(), cost.operationCostPerUnit());
    }

    private String buildPrompt(Product product, CostCalculationService.EstimatedCostResult cost) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product: ").append(product.getProductName() != null ? product.getProductName() : "N/A").append("\n");
        sb.append("SKU: ").append(product.getSku() != null ? product.getSku() : "N/A").append("\n");
        if (product.getMaterialsComposition() != null && !product.getMaterialsComposition().isEmpty()) {
            sb.append("Materials: ").append(product.getMaterialsComposition()).append("\n");
        }
        sb.append("\nManufacturing Cost Breakdown:\n");
        sb.append("- Material cost per unit: ").append(String.format("%.2f", cost.materialCostPerUnit())).append(" ").append(cost.currency()).append("\n");
        sb.append("- Operation cost per unit: ").append(String.format("%.2f", cost.operationCostPerUnit())).append(" ").append(cost.currency()).append("\n");
        sb.append("- Total manufacturing cost: ").append(String.format("%.2f", cost.estimatedUnitPrice())).append(" ").append(cost.currency()).append("\n");
        if (product.getDefaultUnitPrice() != null) {
            sb.append("\nCurrent default price: ").append(product.getDefaultUnitPrice()).append(" ").append(product.getCurrency() != null ? product.getCurrency() : "MAD").append("\n");
        }
        sb.append("\nSuggest a fair retail selling price for this product based on its manufacturing cost and market factors.");
        return sb.toString();
    }

    private String extractContent(Map<String, Object> body) {
        try {
            Object choicesObj = body.get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) return null;
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) return null;
            Object msgObj = firstMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) return null;
            Object content = msgMap.get("content");
            return content == null ? null : content.toString();
        } catch (Exception e) {
            log.warn("Failed to extract Groq response content: {}", e.getMessage());
            return null;
        }
    }

    public record AiPriceSuggestion(
            double suggestedUnitPrice,
            String currency,
            String reasoning,
            double manufacturingCost,
            double materialCost,
            double operationCost
    ) {}
}
