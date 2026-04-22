package com.dppsmart.dppsmart.Production.Entities;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProductionStep {

    private String stepName;

    private String description;

    private boolean completed;

    private int orderIndex;

    private LocalDateTime startDate;

    private LocalDateTime endDate;
}
