package com.dppsmart.dppsmart.Orders.repositories;

import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrdersRepository extends MongoRepository<Orders, String> {
    List<Orders> findByOrganizationId(String organizationId);
    List<Orders> findByClientId(String clientId);
    List<Orders> findByStatus(ClientOrderStatus status);
    boolean existsByOrderReference(String orderReference);
}
