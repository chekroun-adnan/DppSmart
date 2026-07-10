package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OperationSheetItemRepository extends MongoRepository<OperationSheetItem, String> {
    List<OperationSheetItem> findByTechnicalSheetIdOrderByStepOrderAsc(String technicalSheetId);
    void deleteByTechnicalSheetId(String technicalSheetId);
    boolean existsByOperationId(String operationId);
    List<OperationSheetItem> findByOperationId(String operationId);
}
