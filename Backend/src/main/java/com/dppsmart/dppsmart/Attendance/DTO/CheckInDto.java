package com.dppsmart.dppsmart.Attendance.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckInDto {
    @NotBlank(message = "employeeId is required")
    private String employeeId;
    private String organizationId;
    private String notes;
}
