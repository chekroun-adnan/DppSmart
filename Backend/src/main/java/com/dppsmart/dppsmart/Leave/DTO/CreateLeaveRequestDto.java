package com.dppsmart.dppsmart.Leave.DTO;

import com.dppsmart.dppsmart.Leave.Entities.LeaveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateLeaveRequestDto {
    @NotBlank(message = "employeeId is required")
    private String employeeId;
    private String organizationId;
    @NotNull(message = "type is required")
    private LeaveType type;
    @NotNull(message = "startDate is required")
    private LocalDate startDate;
    @NotNull(message = "endDate is required")
    private LocalDate endDate;
    private String reason;
}
