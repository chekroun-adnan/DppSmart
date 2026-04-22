package com.dppsmart.dppsmart.Orders.repositories;

import com.dppsmart.dppsmart.Orders.Entities.Orders;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrdersRepository extends MongoRepository<Orders, String> {
    List<Orders> findByOrganizationId(String organizationId);
    boolean existsByOrderReference(String orderReference);
}


