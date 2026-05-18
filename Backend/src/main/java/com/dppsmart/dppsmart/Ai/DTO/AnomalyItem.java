package com.dppsmart.dppsmart.Ai.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnomalyItem {
    private String type;
    private String description;
    private String severity;
    private String affectedEntity;
}