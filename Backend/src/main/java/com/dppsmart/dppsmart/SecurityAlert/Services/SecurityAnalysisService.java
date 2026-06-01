package com.dppsmart.dppsmart.SecurityAlert.Services;

import com.dppsmart.dppsmart.SecurityAlert.Entities.SecurityAlert;
import com.dppsmart.dppsmart.SecurityAlert.Repositories.SecurityAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityAnalysisService {

    private final SecurityAlertRepository repository;
    private final RuleDetectionService ruleDetection;
    private final SecurityGroqAiService groqAi;

    public SecurityAlert analyzeAndAlert(SecurityAlert ruleAlert) {
        if (ruleAlert == null) return null;

        enrichWithAiAsync(ruleAlert);

        SecurityAlert saved = repository.save(ruleAlert);
        log.info("Security alert created: [{}] {} - {} ({})",
                ruleAlert.getSeverity(), ruleAlert.getType(),
                ruleAlert.getSourceModule(), ruleAlert.getId());
        return saved;
    }

    @Async
    public void enrichWithAiAsync(SecurityAlert alert) {
        try {
            var result = groqAi.analyze(
                    alert.getType(),
                    alert.getSourceModule(),
                    alert.getDescription()
            );
            if (result != null) {
                alert.setAiExplanation(result.explanation());
                alert.setAiRecommendation(result.recommendation());
                if (result.riskScore() > 0) {
                    alert.setRiskScore(result.riskScore());
                    try {
                        alert.setSeverity(SecurityAlert.Severity.valueOf(result.severity().toUpperCase()));
                    } catch (Exception e) {
                        log.warn("Could not parse AI severity: {}", result.severity());
                    }
                }
                repository.save(alert);
                log.debug("AI enrichment completed for alert {}", alert.getId());
            }
        } catch (Exception e) {
            log.warn("AI enrichment failed for alert {}: {}", alert.getId(), e.getMessage());
        }
    }

    public SecurityAlert updateStatus(String id, SecurityAlert.AlertStatus status) {
        SecurityAlert alert = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("SecurityAlert not found: " + id));
        alert.setStatus(status);
        if (status == SecurityAlert.AlertStatus.RESOLVED) {
            alert.setResolvedAt(LocalDateTime.now());
        }
        return repository.save(alert);
    }

    public SecurityAlert manualAnalysis(SecurityAlert alert) {
        enrichWithAiAsync(alert);
        return repository.save(alert);
    }
}
