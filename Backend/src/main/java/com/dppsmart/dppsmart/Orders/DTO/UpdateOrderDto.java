package com.dppsmart.dppsmart.Orders.DTO;

import lombok.Data;

@Data
public class UpdateOrderDto {

    private String id;

    private String status;
    private com.dppsmart.dppsmart.Orders.Entities.MaterialSource materialSource;
}
