package com.dppsmart.dppsmart.Orders.DTO;

import com.dppsmart.dppsmart.Orders.Entities.OrderPriority;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ConfirmWorkflowDto {
    private LocalDate confirmedDeliveryDate;
    private OrderPriority priority;
    private String adminMessage;
}
