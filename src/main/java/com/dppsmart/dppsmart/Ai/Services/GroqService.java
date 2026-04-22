package com.dppsmart.dppsmart.Ai.Services;

import com.dppsmart.dppsmart.Ai.DTO.AiChatRequestDto;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroqService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    private final ProductRepository productRepository;
    private final OrdersRepository ordersRepository;
    private final ScanEventRepository scanEventRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public GroqService(
            ProductRepository productRepository,
            OrdersRepository ordersRepository,
            ScanEventRepository scanEventRepository,
            UserRepository userRepository,
            PermissionService permissionService
    ) {
        this.productRepository = productRepository;
        this.ordersRepository = ordersRepository;
        this.scanEventRepository = scanEventRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
    }

    public String chat(AiChatRequestDto dto) {
        User user = getCurrentUser();
        String userMessage = dto.getMessage() == null ? "" : dto.getMessage().trim();
        String lower = userMessage.toLowerCase(Locale.ROOT);

        if (containsAny(lower, "list products", "show products", "available products")) {
            List<Product> products = productRepository.findAll().stream()
                    .filter(p -> permissionService.canAccessOrganization(user, p.getOrganizationId()))
                    .limit(25)
                    .toList();
            if (products.isEmpty()) return "No products found in your scope.";
            return products.stream()
                    .map(p -> "- " + safe(p.getProductName()) + " (id: " + p.getId() + ")")
                    .collect(Collectors.joining("\n"));
        }

        if (containsAny(lower, "how many products", "count products", "products count")) {
            long count = productRepository.findAll().stream()
                    .filter(p -> permissionService.canAccessOrganization(user, p.getOrganizationId()))
                    .count();
            return "You have access to " + count + " products.";
        }

        if (containsAny(lower, "how many orders", "count orders", "orders count")) {
            long count = ordersRepository.findAll().stream()
                    .filter(o -> permissionService.canAccessOrganization(user, o.getOrganizationId()))
                    .count();
            return "You have access to " + count + " orders.";
        }

        if (containsAny(lower, "how many scans", "count scans", "scans count")) {
            long count = scanEventRepository.findAll().stream()
                    .filter(s -> permissionService.canAccessOrganization(user, s.getOrganizationId()))
                    .count();
            return "You have access to " + count + " scan events.";
        }

        if (containsAny(lower, "scans today", "today scans", "scans last 24h", "scans last 24 hours")) {
            LocalDateTime since = LocalDateTime.now().minusHours(24);
            long count = scanEventRepository.findByScannedAtAfter(since).stream()
                    .filter(s -> permissionService.canAccessOrganization(user, s.getOrganizationId()))
                    .count();
            return "In the last 24 hours, there were " + count + " scans in your scope.";
        }

        if (lower.startsWith("product ")) {
            String[] parts = userMessage.split("\\s+");
            if (parts.length >= 2) {
                String productId = parts[1].trim();
                Product p = productRepository.findById(productId).orElse(null);
                if (p == null) return "I couldn't find a product with id " + productId + ".";
                if (!permissionService.canAccessOrganization(user, p.getOrganizationId())) {
                    throw new ForbiddenException("You are not allowed to access this product");
                }
                return "Product: " + safe(p.getProductName()) + "\n"
                        + "- category: " + safe(p.getCategory()) + "\n"
                        + "- material: " + safe(p.getMaterial()) + "\n"
                        + "- certification: " + safe(p.getCertification());
            }
        }


        if (apiKey == null || apiKey.isBlank()) {
            return """
                    AI is not configured yet (missing GROQ_API_KEY).
                    I can still answer basic database questions like: "list products", "how many orders", "scans last 24h".
                    """.trim();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> systemMessage = Map.of(
                "role", "system",
                "content", """
                    You are a helpful assistant for the DppSmart application.
                    You help users with Digital Product Passport (DPP) management: products, production steps, scans, stock, orders, organizations, and users.
                    If the question is unrelated to DppSmart, politely say you only help with DppSmart topics.
                    Keep answers short and actionable.
                    """
        );
        Map<String, String> userMsg = Map.of("role", "user", "content", userMessage);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", List.of(systemMessage, userMsg));
        payload.put("temperature", 0.2);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

        if (response.getStatusCode().isError()) {
            throw new RuntimeException("Failed to get response from Groq API: " + response.getStatusCode());
        }
        if (response.getBody() == null) {
            throw new RuntimeException("Groq API returned empty body");
        }

        Object choicesObj = response.getBody().get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
            throw new RuntimeException("Groq API returned no choices");
        }

        Object first = choices.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) {
            throw new RuntimeException("Groq API returned invalid choices format");
        }

        Object msgObj = firstMap.get("message");
        if (!(msgObj instanceof Map<?, ?> msgMap)) {
            throw new RuntimeException("Groq API returned invalid message format");
        }

        Object content = msgMap.get("content");
        return content == null ? "" : content.toString();
    }

    private boolean containsAny(String lower, String... needles) {
        for (String n : needles) if (lower.contains(n)) return true;
        return false;
    }

    private String safe(String s) {
        return (s == null || s.isBlank()) ? "(not set)" : s;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

