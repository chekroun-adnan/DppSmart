package com.dppsmart.dppsmart.Dashboard.DTO;

import lombok.Data;

@Data
public class BottleneckDto {
    private String stage;
    private Long delayedCount;
    private String note;
}
