package com.dppsmart.dppsmart.Orders.repositories;

import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface OrdersRepository extends MongoRepository<Orders, String> {
    List<Orders> findByOrganizationId(String organizationId);
    List<Orders> findByClientId(String clientId);
    List<Orders> findByStatus(ClientOrderStatus status);
    boolean existsByOrderReference(String orderReference);
    Optional<Orders> findByDeliveryTokenAndStatus(String deliveryToken, ClientOrderStatus status);
    Optional<Orders> findBySupplyChainOrderId(String supplyChainOrderId);
}
