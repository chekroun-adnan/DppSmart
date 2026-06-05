package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OperationRepository extends MongoRepository<Operation, String> {
    List<Operation> findByOrganizationId(String organizationId);
    List<Operation> findByOrganizationIdAndActive(String organizationId, Boolean active);
    boolean existsByNameAndOrganizationId(String name, String organizationId);
}
