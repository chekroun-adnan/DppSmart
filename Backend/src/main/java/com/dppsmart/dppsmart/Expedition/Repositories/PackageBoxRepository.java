package com.dppsmart.dppsmart.Expedition.Repositories;

import com.dppsmart.dppsmart.Expedition.Entities.BoxStatus;
import com.dppsmart.dppsmart.Expedition.Entities.PackageBox;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PackageBoxRepository extends MongoRepository<PackageBox, String> {
    List<PackageBox> findByExpeditionIdOrderByBoxNumberAsc(String expeditionId);
    void deleteByExpeditionId(String expeditionId);
    long countByExpeditionIdIn(List<String> expeditionIds);
    long countByExpeditionIdInAndStatus(List<String> expeditionIds, BoxStatus status);
    long countByStatus(BoxStatus status);
}
