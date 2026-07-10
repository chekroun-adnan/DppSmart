package com.dppsmart.dppsmart.Expedition.DTO;

import lombok.Data;

@Data
public class ExpeditionDashboardDto {
    private long ordersPacking;
    private long ordersReadyToShip;
    private long boxesCreated;
    private long boxesFilled;
    private long partialBoxes;
    private long boxesShipped;
    private Double averagePackingTimeHours;
}
