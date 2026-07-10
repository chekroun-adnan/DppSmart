package com.dppsmart.dppsmart.Production.Repositories;

import com.dppsmart.dppsmart.Production.Entities.OperationIssue;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OperationIssueRepository extends MongoRepository<OperationIssue, String> {
    List<OperationIssue> findByStepIdOrderByCreatedAtDesc(String stepId);
    List<OperationIssue> findByOrderIdOrderByCreatedAtDesc(String orderId);
    long countByResolved(boolean resolved);
}
