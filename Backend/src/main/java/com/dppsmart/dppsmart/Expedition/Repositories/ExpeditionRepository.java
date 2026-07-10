package com.dppsmart.dppsmart.Expedition.Repositories;

import com.dppsmart.dppsmart.Expedition.Entities.Expedition;
import com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExpeditionRepository extends MongoRepository<Expedition, String> {
    Optional<Expedition> findByOrderId(String orderId);
    List<Expedition> findByOrganizationId(String organizationId);
    List<Expedition> findByOrganizationIdAndStatus(String organizationId, ExpeditionStatus status);
    List<Expedition> findByStatus(ExpeditionStatus status);
    long countByOrganizationIdAndStatus(String organizationId, ExpeditionStatus status);
    long countByStatus(ExpeditionStatus status);
    long count();
}
