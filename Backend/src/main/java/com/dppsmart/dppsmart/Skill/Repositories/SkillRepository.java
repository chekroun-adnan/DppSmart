package com.dppsmart.dppsmart.Skill.Repositories;

import com.dppsmart.dppsmart.Skill.Entities.Skill;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SkillRepository extends MongoRepository<Skill, String> {
    List<Skill> findByActiveTrue();
    List<Skill> findByCategory(String category);
}
