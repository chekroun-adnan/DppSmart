package com.dppsmart.dppsmart.Employee.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmployeeSkill {
    private String skillId;
    private String skillName;
    private SkillLevel level;
}
