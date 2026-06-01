package com.dppsmart.dppsmart.Scan.Repositories;

import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScanEventRepository extends MongoRepository<ScanEvent, String> {
    List<ScanEvent> findByProductIdOrderByScannedAtDesc(String productId);
    List<ScanEvent> findByOrganizationIdOrderByScannedAtDesc(String organizationId);

    List<ScanEvent> findByOrganizationIdAndRiskScoreGreaterThanOrderByScannedAtDesc(
            String organizationId, int minRisk);

    List<ScanEvent> findByOrganizationIdAndFakeProductTrueOrderByScannedAtDesc(
            String organizationId);

    List<ScanEvent> findByOrganizationIdAndScannedAtBetweenOrderByScannedAtDesc(
            String organizationId, LocalDateTime start, LocalDateTime end);

    long countByScannedAtAfter(LocalDateTime scannedAt);
    List<ScanEvent> findByScannedAtAfter(LocalDateTime scannedAt);

    long countByOrganizationIdAndScannedAtAfter(String organizationId, LocalDateTime after);

    long countByOrganizationIdAndRiskScoreGreaterThan(String organizationId, int minRisk);

    long countByOrganizationIdAndFakeProductTrue(String organizationId);

    java.util.Optional<ScanEvent> findFirstByProductIdAndIpAndScannedAtAfterOrderByScannedAtDesc(
            String productId, String ip, LocalDateTime after);

    List<ScanEvent> findByIpAndScannedAtAfterOrderByScannedAtDesc(String ip, LocalDateTime after);

    java.util.Optional<ScanEvent> findFirstByIpAndScannedAtBeforeOrderByScannedAtDesc(String ip, LocalDateTime before);

    long countByIpAndScannedAtAfter(String ip, LocalDateTime after);
}
