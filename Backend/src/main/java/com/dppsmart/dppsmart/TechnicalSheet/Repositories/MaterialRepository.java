package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.Material;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MaterialRepository extends MongoRepository<Material, String> {
    List<Material> findByOrganizationId(String organizationId);
}
