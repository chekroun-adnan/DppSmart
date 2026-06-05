package com.dppsmart.dppsmart.Skill.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SkillResponseDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private boolean active;
    private LocalDateTime createdAt;
}
