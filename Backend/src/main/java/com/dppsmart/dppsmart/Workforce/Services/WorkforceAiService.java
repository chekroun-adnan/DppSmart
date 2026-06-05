package com.dppsmart.dppsmart.Workforce.Services;

import com.dppsmart.dppsmart.Workforce.DTO.WorkforcePlanDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkforceAiService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateRecommendation(WorkforcePlanDto plan) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildRuleBasedRecommendation(plan);
        }
        try {
            String prompt = buildPrompt(plan);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content",
                        "You are an AI workforce analyst for a textile manufacturing ERP. " +
                        "Analyze workforce data and provide concise, actionable recommendations in 2-3 sentences."),
                    Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", 200,
                "temperature", 0.3
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            if (response.getBody() != null) {
                var choices = (List<?>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    var message = ((Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message"));
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            log.warn("Groq AI unavailable for workforce recommendation: {}", e.getMessage());
        }
        return buildRuleBasedRecommendation(plan);
    }

    private String buildPrompt(WorkforcePlanDto plan) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Workforce status: %d total employees, %d present today, %d on leave, %d overloaded. ",
                plan.getTotalEmployees(), plan.getPresentToday(), plan.getOnLeave(), plan.getOverloaded()));
        if (plan.getDepartmentCapacities() != null) {
            plan.getDepartmentCapacities().stream()
                    .filter(d -> !"OK".equals(d.getStatus()))
                    .forEach(d -> sb.append(String.format("%s department: %d available of %d, status=%s. ",
                            d.getDepartmentName(), d.getAvailableEmployees(), d.getTotalEmployees(), d.getStatus())));
        }
        sb.append("Provide workforce recommendations.");
        return sb.toString();
    }

    private String buildRuleBasedRecommendation(WorkforcePlanDto plan) {
        if (plan.getOverloaded() > 0) {
            return String.format("%d employee(s) are overloaded. Consider redistributing assignments or adding temporary workforce to prevent production delays.", plan.getOverloaded());
        }
        if (plan.getOnLeave() > plan.getTotalEmployees() / 4) {
            return String.format("High absenteeism detected (%d of %d employees on leave). Review leave scheduling to ensure minimum department coverage.", plan.getOnLeave(), plan.getTotalEmployees());
        }
        boolean hasCritical = plan.getDepartmentCapacities() != null &&
                plan.getDepartmentCapacities().stream().anyMatch(d -> "CRITICAL".equals(d.getStatus()));
        if (hasCritical) {
            return "One or more departments have no available employees. Immediate action required to reassign tasks or postpone non-critical production orders.";
        }
        return "Workforce levels appear normal. Continue monitoring for upcoming production peaks and plan staffing accordingly.";
    }
}
