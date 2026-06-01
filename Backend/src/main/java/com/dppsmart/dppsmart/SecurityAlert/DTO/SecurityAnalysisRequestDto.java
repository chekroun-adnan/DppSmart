package com.dppsmart.dppsmart.SecurityAlert.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SecurityAnalysisRequestDto {

    @NotBlank
    @Size(max = 50)
    private String type;

    @NotBlank
    @Size(max = 50)
    private String sourceModule;

    @Size(max = 100)
    private String entityId;

    @Size(max = 100)
    private String userId;

    @Size(max = 100)
    private String organizationId;

    @NotBlank
    @Size(max = 2000)
    private String description;
}
