package com.dppsmart.dppsmart.Scan.Repositories;

import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScanEventRepository extends MongoRepository<ScanEvent, String> {
    List<ScanEvent> findByProductIdOrderByScannedAtDesc(String productId);
    List<ScanEvent> findByOrganizationIdOrderByScannedAtDesc(String organizationId);

    long countByScannedAtAfter(LocalDateTime scannedAt);

    List<ScanEvent> findByScannedAtAfter(LocalDateTime scannedAt);
}

