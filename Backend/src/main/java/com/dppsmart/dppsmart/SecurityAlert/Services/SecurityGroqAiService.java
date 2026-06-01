package com.dppsmart.dppsmart.SecurityAlert.Services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class SecurityGroqAiService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SYSTEM_PROMPT = """
            You are a cybersecurity analyst for the DppSmart platform, a Digital Product Passport and manufacturing management system.
            Your role is to analyze suspicious security/business events and provide:
            1. A human-readable explanation of what happened and why it is suspicious
            2. A severity level: LOW, MEDIUM, HIGH, or CRITICAL
            3. An actionable recommendation for the security/admin team
            4. A risk score from 0 (no risk) to 100 (critical)

            Rules:
            - Be concise and specific to the event context
            - Do not fabricate data — analyze only what is provided
            - Consider business impact when assigning severity
            - Recommendations must be actionable

            Respond ONLY with valid JSON in this exact format:
            {
              "explanation": "...",
              "severity": "LOW|MEDIUM|HIGH|CRITICAL",
              "recommendation": "...",
              "riskScore": 0-100
            }
            """;

    public AiAnalysisResult analyze(String eventType, String sourceModule, String description) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("Groq API key not configured — skipping AI analysis for event: {}/{}", sourceModule, eventType);
            return null;
        }

        try {
            String prompt = buildPrompt(eventType, sourceModule, description);
            String raw = callGroq(prompt);
            return parseResponse(raw);
        } catch (Exception e) {
            log.warn("Groq AI analysis failed for event {}/{}: {}", sourceModule, eventType, e.getMessage());
            return null;
        }
    }

    private String buildPrompt(String type, String module, String description) {
        return "Analyze this security/business event:\n"
                + "- Type: " + type + "\n"
                + "- Source Module: " + module + "\n"
                + "- Description: " + description + "\n\n"
                + "Provide explanation, severity, recommendation, and risk score as JSON.";
    }

    private String callGroq(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", prompt)
        ));
        payload.put("temperature", 0.2);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

        if (response.getBody() == null) throw new RuntimeException("Empty Groq response");

        Object choicesObj = response.getBody().get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
            throw new RuntimeException("No choices in Groq response");
        }

        Object first = choices.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) throw new RuntimeException("Invalid choices format");

        Object msgObj = firstMap.get("message");
        if (!(msgObj instanceof Map<?, ?> msgMap)) throw new RuntimeException("Invalid message format");

        Object content = msgMap.get("content");
        return content == null ? "" : content.toString();
    }

    @SuppressWarnings("unchecked")
    private AiAnalysisResult parseResponse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            tools.jackson.databind.ObjectMapper mapper = new tools.jackson.databind.ObjectMapper();
            Map<String, Object> map = mapper.readValue(raw, Map.class);
            return new AiAnalysisResult(
                    (String) map.getOrDefault("explanation", ""),
                    (String) map.getOrDefault("severity", "LOW"),
                    (String) map.getOrDefault("recommendation", ""),
                    (Integer) map.getOrDefault("riskScore", 0)
            );
        } catch (Exception e) {
            log.warn("Failed to parse Groq response: {}", e.getMessage());
            return null;
        }
    }

    public record AiAnalysisResult(
            String explanation,
            String severity,
            String recommendation,
            int riskScore
    ) {}
}
