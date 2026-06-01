package com.dppsmart.dppsmart.TechnicalSheet.Repositories;

import com.dppsmart.dppsmart.TechnicalSheet.Entities.MaterialSheetItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MaterialSheetItemRepository extends MongoRepository<MaterialSheetItem, String> {
    List<MaterialSheetItem> findByTechnicalSheetId(String technicalSheetId);
    void deleteByTechnicalSheetId(String technicalSheetId);
    List<MaterialSheetItem> findByMaterialId(String materialId);
}
