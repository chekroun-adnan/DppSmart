package com.dppsmart.dppsmart.Orders.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collation = "orders")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Orders {

    @Id
    private String id;
    private String orderReference;
    private String productId;
    private Integer quantity;
    private String status;
    private LocalDateTime createdAt;
}
