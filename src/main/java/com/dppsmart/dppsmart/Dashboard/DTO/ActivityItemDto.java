package com.dppsmart.dppsmart.Dashboard.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ActivityItemDto {
    private String type;
    private String title;
    private String description;
    private LocalDateTime timestamp;
}
