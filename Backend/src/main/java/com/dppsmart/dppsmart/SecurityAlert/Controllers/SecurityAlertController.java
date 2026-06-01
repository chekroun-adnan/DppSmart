package com.dppsmart.dppsmart.SecurityAlert.Controllers;

import com.dppsmart.dppsmart.SecurityAlert.DTO.SecurityAlertResponseDto;
import com.dppsmart.dppsmart.SecurityAlert.DTO.SecurityAlertStatsDto;
import com.dppsmart.dppsmart.SecurityAlert.DTO.SecurityAnalysisRequestDto;
import com.dppsmart.dppsmart.SecurityAlert.Entities.SecurityAlert;
import com.dppsmart.dppsmart.SecurityAlert.Repositories.SecurityAlertRepository;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityGroqAiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/security-alerts")
@RequiredArgsConstructor
@Tag(name = "Security Alerts", description = "AI-powered security alert management")
public class SecurityAlertController {

    private final SecurityAlertRepository repository;
    private final SecurityAnalysisService analysisService;
    private final RuleDetectionService ruleDetection;
    private final SecurityGroqAiService groqAi;

    @GetMapping
    @Operation(summary = "Get all alerts for an organization")
    public ResponseEntity<List<SecurityAlertResponseDto>> getAll(
            @RequestParam String organizationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String sourceModule) {

        List<SecurityAlert> alerts;
        if (status != null) {
            alerts = repository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(
                    organizationId, SecurityAlert.AlertStatus.valueOf(status.toUpperCase()));
        } else if (severity != null) {
            alerts = repository.findByOrganizationIdAndSeverityOrderByCreatedAtDesc(
                    organizationId, SecurityAlert.Severity.valueOf(severity.toUpperCase()));
        } else if (sourceModule != null) {
            alerts = repository.findByOrganizationIdAndSourceModuleOrderByCreatedAtDesc(
                    organizationId, sourceModule.toUpperCase());
        } else {
            alerts = repository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        }

        return ResponseEntity.ok(alerts.stream().map(SecurityAlertResponseDto::from).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single security alert")
    public ResponseEntity<SecurityAlertResponseDto> getById(
            @PathVariable String id,
            @RequestParam String organizationId) {
        return repository.findByIdAndOrganizationId(id, organizationId)
                .map(a -> ResponseEntity.ok(SecurityAlertResponseDto.from(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    @Operation(summary = "Get security alert statistics")
    public ResponseEntity<SecurityAlertStatsDto> getStats(@RequestParam String organizationId) {
        SecurityAlertStatsDto stats = new SecurityAlertStatsDto();
        stats.setTotalOpen(repository.countByOrganizationIdAndStatus(organizationId, SecurityAlert.AlertStatus.OPEN));
        stats.setTotalCritical(repository.countByOrganizationIdAndSeverityAndStatus(
                organizationId, SecurityAlert.Severity.CRITICAL, SecurityAlert.AlertStatus.OPEN));
        stats.setTotalHigh(repository.countByOrganizationIdAndSeverityAndStatus(
                organizationId, SecurityAlert.Severity.HIGH, SecurityAlert.AlertStatus.OPEN));
        stats.setTotalMedium(repository.countByOrganizationIdAndSeverityAndStatus(
                organizationId, SecurityAlert.Severity.MEDIUM, SecurityAlert.AlertStatus.OPEN));
        stats.setTotalLow(repository.countByOrganizationIdAndSeverityAndStatus(
                organizationId, SecurityAlert.Severity.LOW, SecurityAlert.AlertStatus.OPEN));
        stats.setAuthAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "AUTH", SecurityAlert.AlertStatus.OPEN));
        stats.setStockAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "STOCK", SecurityAlert.AlertStatus.OPEN));
        stats.setSupplierAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "SUPPLIER", SecurityAlert.AlertStatus.OPEN));
        stats.setOrderAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "ORDER", SecurityAlert.AlertStatus.OPEN));
        stats.setQrScanAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "QR_SCAN", SecurityAlert.AlertStatus.OPEN));
        stats.setProductionAlerts(repository.countByOrganizationIdAndSourceModuleAndStatus(
                organizationId, "PRODUCTION", SecurityAlert.AlertStatus.OPEN));
        return ResponseEntity.ok(stats);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update alert status")
    public ResponseEntity<SecurityAlertResponseDto> updateStatus(
            @PathVariable String id,
            @RequestParam String status) {
        var alert = analysisService.updateStatus(id, SecurityAlert.AlertStatus.valueOf(status.toUpperCase()));
        return ResponseEntity.ok(SecurityAlertResponseDto.from(alert));
    }

    @PostMapping("/analyze")
    @Operation(summary = "Manually trigger AI analysis for an event")
    public ResponseEntity<SecurityAlertResponseDto> analyzeEvent(
            @Valid @RequestBody SecurityAnalysisRequestDto request) {

        var ruleAlert = ruleDetection.detectAuthAnomaly(
                request.getUserId(), "manual", 0, "manual", request.getOrganizationId());

        if (ruleAlert == null) {
            ruleAlert = ruleDetection.detectOrderAnomaly(
                    request.getEntityId(), 0, false, request.getDescription(),
                    request.getOrganizationId(), request.getUserId());
        }

        if (ruleAlert == null) {
            var groqResult = groqAi.analyze(request.getType(), request.getSourceModule(), request.getDescription());
            if (groqResult == null) {
                return ResponseEntity.badRequest().build();
            }
            ruleAlert = new SecurityAlert();
            ruleAlert.setId(java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 21));
            ruleAlert.setType(request.getType());
            ruleAlert.setSourceModule(request.getSourceModule());
            ruleAlert.setEntityId(request.getEntityId());
            ruleAlert.setUserId(request.getUserId());
            ruleAlert.setOrganizationId(request.getOrganizationId());
            ruleAlert.setDescription(request.getDescription());
            ruleAlert.setAiExplanation(groqResult.explanation());
            ruleAlert.setAiRecommendation(groqResult.recommendation());
            try {
                ruleAlert.setSeverity(SecurityAlert.Severity.valueOf(groqResult.severity().toUpperCase()));
            } catch (Exception e) {
                ruleAlert.setSeverity(SecurityAlert.Severity.MEDIUM);
            }
            ruleAlert.setRiskScore(groqResult.riskScore());
            ruleAlert.setStatus(SecurityAlert.AlertStatus.OPEN);
            ruleAlert.setCreatedAt(LocalDateTime.now());
        }

        var saved = analysisService.analyzeAndAlert(ruleAlert);
        return ResponseEntity.ok(SecurityAlertResponseDto.from(saved));
    }
}
