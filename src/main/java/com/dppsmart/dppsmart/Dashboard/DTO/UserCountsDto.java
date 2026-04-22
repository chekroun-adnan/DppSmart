package com.dppsmart.dppsmart.Dashboard.DTO;

import lombok.Data;

@Data
public class UserCountsDto {
    private Long admins;
    private Long subAdmins;
    private Long clients;
    private Long total;
}

