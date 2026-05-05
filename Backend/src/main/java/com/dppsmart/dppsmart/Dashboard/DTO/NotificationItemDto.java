package com.dppsmart.dppsmart.Dashboard.DTO;

import lombok.Data;

@Data
public class NotificationItemDto {
    private String severity;
    private String title;
    private String message;
}
