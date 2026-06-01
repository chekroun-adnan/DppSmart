package com.dppsmart.dppsmart.Scan.Services;

import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ScanAnomalyService {

    private static final long REPEATED_SCAN_WINDOW_SECONDS = 10;
    private static final long IMPOSSIBLE_TRAVEL_KM_PER_HOUR = 900;
    private static final int MAX_SCANS_PER_HOUR = 50;

    private final ScanEventRepository scanEventRepository;

    public AnomalyResult analyze(ScanEvent event) {
        List<String> flags = new ArrayList<>();

        boolean repeatedScan = detectRepeatedScan(event);
        if (repeatedScan) flags.add("REPEATED_SCAN");

        boolean rapidScan = detectRapidScan(event);
        if (rapidScan) flags.add("RAPID_SCAN");

        boolean impossibleTravel = detectImpossibleTravel(event);
        if (impossibleTravel) flags.add("IMPOSSIBLE_TRAVEL");

        boolean signatureInvalid = event.getSignatureValid() != null && !event.getSignatureValid();
        if (signatureInvalid) flags.add("INVALID_SIGNATURE");

        boolean expiredQr = event.getSource() != null && "EXPIRED_QR".equals(event.getSource());
        if (expiredQr) flags.add("EXPIRED_QR");

        boolean hourLimitExceeded = detectHourlyRateExceeded(event);
        if (hourLimitExceeded) flags.add("RATE_LIMIT_EXCEEDED");

        int riskScore = computeRiskScore(flags, event);
        boolean fakeProduct = flags.size() >= 3 || riskScore >= 70;

        return new AnomalyResult(riskScore, flags, fakeProduct);
    }

    boolean detectRepeatedScan(ScanEvent event) {
        return scanEventRepository
                .findFirstByProductIdAndIpAndScannedAtAfterOrderByScannedAtDesc(
                        event.getProductId(),
                        event.getIp(),
                        event.getScannedAt().minusSeconds(REPEATED_SCAN_WINDOW_SECONDS))
                .isPresent();
    }

    boolean detectRapidScan(ScanEvent event) {
        List<ScanEvent> recent = scanEventRepository
                .findByIpAndScannedAtAfterOrderByScannedAtDesc(
                        event.getIp(),
                        event.getScannedAt().minusSeconds(60));
        return recent.size() > 10;
    }

    boolean detectImpossibleTravel(ScanEvent event) {
        if (event.getLatitude() == null || event.getLongitude() == null) return false;

        var previous = scanEventRepository
                .findFirstByIpAndScannedAtBeforeOrderByScannedAtDesc(
                        event.getIp(), event.getScannedAt());

        if (previous.isEmpty()) return false;
        ScanEvent prev = previous.get();
        if (prev.getLatitude() == null || prev.getLongitude() == null) return false;

        double distanceKm = haversine(
                prev.getLatitude(), prev.getLongitude(),
                event.getLatitude(), event.getLongitude()
        );

        long secondsDiff = java.time.Duration.between(prev.getScannedAt(), event.getScannedAt()).getSeconds();
        if (secondsDiff <= 0) return false;

        double speedKmph = distanceKm / (secondsDiff / 3600.0);
        return speedKmph > IMPOSSIBLE_TRAVEL_KM_PER_HOUR;
    }

    boolean detectHourlyRateExceeded(ScanEvent event) {
        long count = scanEventRepository
                .countByIpAndScannedAtAfter(
                        event.getIp(),
                        event.getScannedAt().minusHours(1));
        return count > MAX_SCANS_PER_HOUR;
    }

    private int computeRiskScore(List<String> flags, ScanEvent event) {
        int score = 0;
        if (flags.contains("INVALID_SIGNATURE")) score += 40;
        if (flags.contains("EXPIRED_QR")) score += 30;
        if (flags.contains("IMPOSSIBLE_TRAVEL")) score += 25;
        if (flags.contains("REPEATED_SCAN")) score += 15;
        if (flags.contains("RAPID_SCAN")) score += 10;
        if (flags.contains("RATE_LIMIT_EXCEEDED")) score += 20;
        if (flags.isEmpty()) score = 0;
        return Math.min(score, 100);
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c;
    }

    public record AnomalyResult(int riskScore, List<String> flags, boolean fakeProduct) {}
}
