package com.dppsmart.dppsmart.Production.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateIssueRequest {
    @NotBlank
    private String issueType;
    @NotBlank
    private String title;
    private String description;
}
