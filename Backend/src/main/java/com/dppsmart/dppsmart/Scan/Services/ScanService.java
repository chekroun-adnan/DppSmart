package com.dppsmart.dppsmart.Scan.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Scan.DTO.CreateScanEventDto;
import com.dppsmart.dppsmart.Scan.DTO.ScanAlertDto;
import com.dppsmart.dppsmart.Scan.DTO.ScanAnalyticsDto;
import com.dppsmart.dppsmart.Scan.DTO.ScanEventResponseDto;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Mapper.ScanEventMapper;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScanService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ScanEventRepository scanEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final NotificationServiceImpl notificationService;
    private final QRCodeSigningService signingService;
    private final ScanAnomalyService anomalyService;
    private final SecurityAnalysisService securityAnalysisService;
    private final RuleDetectionService ruleDetectionService;

    public ScanEventResponseDto recordScan(CreateScanEventDto dto, HttpServletRequest request) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new NotFoundException("Product not found"));

        ScanEvent event = baseEvent(dto.getProductId(), product.getOrganizationId(), request);
        event.setLatitude(dto.getLatitude());
        event.setLongitude(dto.getLongitude());
        event.setLocationText(dto.getLocationText());
        event.setSignature(dto.getSignature());

        verifyAndDetect(event, product);

        ScanEvent saved = scanEventRepository.save(event);

        var scanAlert = ruleDetectionService.detectQrScanAnomaly(
                saved.getProductId(), saved.getIp(),
                saved.getSignatureValid(), isRepeatedScan(saved),
                false, 0, saved.getOrganizationId());
        if (scanAlert != null) {
            securityAnalysisService.analyzeAndAlert(scanAlert);
        }

        if (Boolean.TRUE.equals(saved.getFakeProduct()) || (saved.getRiskScore() != null && saved.getRiskScore() >= 50)) {
            notificationService.createNotification(
                    saved.getScannedByUserEmail() != null
                            ? userRepository.findByEmail(saved.getScannedByUserEmail()).map(User::getId).orElse(null)
                            : null,
                    "Suspicious Scan Alert",
                    "Suspicious scan detected for " + product.getProductName()
                            + " — risk score: " + saved.getRiskScore(),
                    com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.ALERT,
                    "/scans"
            );
        }

        return ScanEventMapper.toDto(saved);
    }

    public void recordDppOpen(String productId, HttpServletRequest request) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        ScanEvent event = baseEvent(productId, product.getOrganizationId(), request);

        verifyAndDetect(event, product);

        scanEventRepository.save(event);
    }

    public ScanAnalyticsDto getAnalytics(String organizationId) {
        User user = requireUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization's scan data");
        }

        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);

        long totalScans = scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(organizationId).size();
        long scansToday = scanEventRepository.countByOrganizationIdAndScannedAtAfter(organizationId, startOfDay);
        long suspiciousScans = scanEventRepository.countByOrganizationIdAndRiskScoreGreaterThan(organizationId, 0);
        long fakeProducts = scanEventRepository.countByOrganizationIdAndFakeProductTrue(organizationId);

        List<ScanEventResponseDto> recentScans = scanEventRepository
                .findByOrganizationIdOrderByScannedAtDesc(organizationId)
                .stream().limit(20).map(ScanEventMapper::toDto).toList();

        List<ScanEventResponseDto> recentSuspicious = scanEventRepository
                .findByOrganizationIdAndRiskScoreGreaterThanOrderByScannedAtDesc(organizationId, 0)
                .stream().limit(20).map(ScanEventMapper::toDto).toList();

        return new ScanAnalyticsDto(totalScans, scansToday, suspiciousScans, fakeProducts, recentScans, recentSuspicious);
    }

    public List<ScanAlertDto> getAlerts(String organizationId) {
        User user = requireUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization's alerts");
        }

        return scanEventRepository
                .findByOrganizationIdAndRiskScoreGreaterThanOrderByScannedAtDesc(organizationId, 0)
                .stream().limit(50).map(e -> {
                    String productName = productRepository.findById(e.getProductId())
                            .map(Product::getProductName).orElse("Unknown");
                    return new ScanAlertDto(
                            e.getId(), e.getProductId(), productName,
                            e.getRiskScore() != null ? e.getRiskScore() : 0,
                            e.getAnomalyFlags(),
                            Boolean.TRUE.equals(e.getFakeProduct()),
                            e.getScannedAt() != null ? e.getScannedAt().format(FMT) : null,
                            e.getIp(),
                            e.getLocationText()
                    );
                }).toList();
    }

    public List<ScanEventResponseDto> getByProduct(String productId) {
        User user = requireUser();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access scans for this product");
        }
        return scanEventRepository.findByProductIdOrderByScannedAtDesc(productId)
                .stream()
                .map(ScanEventMapper::toDto)
                .toList();
    }

    public List<ScanEventResponseDto> getByOrganization(String organizationId) {
        User user = requireUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access scans for this organization");
        }
        return scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(organizationId)
                .stream()
                .map(ScanEventMapper::toDto)
                .toList();
    }

    private void verifyAndDetect(ScanEvent event, Product product) {
        if (event.getSignature() != null && !event.getSignature().isBlank()) {
            int version = product.getVersion() != null ? product.getVersion() : 1;
            var result = signingService.verify(product.getId(), version, event.getSignature());
            event.setSignatureValid(result.valid());
            if (result.expired()) {
                event.setSource("EXPIRED_QR");
            }
        } else {
            event.setSignatureValid(false);
        }

        var anomaly = anomalyService.analyze(event);
        event.setRiskScore(anomaly.riskScore());
        event.setAnomalyFlags(anomaly.flags());
        event.setFakeProduct(anomaly.fakeProduct());
    }

    private ScanEvent baseEvent(String productId, String organizationId, HttpServletRequest request) {
        ScanEvent event = new ScanEvent();
        event.setId(NanoIdUtils.randomNanoId());
        event.setProductId(productId);
        event.setOrganizationId(organizationId);
        event.setScannedAt(LocalDateTime.now());
        event.setScannedUrl(request != null ? request.getRequestURL().toString() : null);
        event.setIp(extractIp(request));
        event.setUserAgent(request != null ? request.getHeader("User-Agent") : null);
        event.setReferer(request != null ? request.getHeader("Referer") : null);
        if (event.getSource() == null) event.setSource("QR_SCAN");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            event.setScannedByUserEmail(auth.getName());
        }
        return event;
    }

    private String extractIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isRepeatedScan(ScanEvent event) {
        if (event.getProductId() == null) return false;
        return scanEventRepository.findByProductIdOrderByScannedAtDesc(event.getProductId())
                .stream()
                .skip(1)
                .anyMatch(e -> e.getIp() != null && e.getIp().equals(event.getIp())
                        && e.getScannedAt() != null && event.getScannedAt() != null
                        && e.getScannedAt().plusSeconds(10).isAfter(event.getScannedAt()));
    }

    private User requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
