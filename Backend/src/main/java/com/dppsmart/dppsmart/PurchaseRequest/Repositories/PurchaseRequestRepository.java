package com.dppsmart.dppsmart.PurchaseRequest.Repositories;

import com.dppsmart.dppsmart.PurchaseRequest.Entities.PurchaseRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PurchaseRequestRepository extends MongoRepository<PurchaseRequest, String> {
    List<PurchaseRequest> findByOrderId(String orderId);
    List<PurchaseRequest> findByOrganizationId(String organizationId);
}
