package com.dppsmart.dppsmart.SupplyChain.Repositories;

import com.dppsmart.dppsmart.SupplyChain.Entities.ReturnRequest;
import com.dppsmart.dppsmart.SupplyChain.Enums.ReturnRequestStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ReturnRequestRepository extends MongoRepository<ReturnRequest, String> {
    List<ReturnRequest> findByPurchaseOrderId(String purchaseOrderId);
    List<ReturnRequest> findByPurchaseOrderItemId(String purchaseOrderItemId);
    List<ReturnRequest> findByOrganizationId(String organizationId);
    List<ReturnRequest> findByStatus(ReturnRequestStatus status);
    Optional<ReturnRequest> findByReturnId(String returnId);
}