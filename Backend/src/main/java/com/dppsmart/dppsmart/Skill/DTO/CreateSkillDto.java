package com.dppsmart.dppsmart.Skill.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSkillDto {
    @NotBlank(message = "name is required")
    private String name;
    private String description;
    private String category;
}
