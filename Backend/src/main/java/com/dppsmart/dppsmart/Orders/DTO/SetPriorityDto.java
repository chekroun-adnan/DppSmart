package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Entities.OrderPriority;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetPriorityDto {
    @NotNull
    private OrderPriority priority;
}
