package com.dppsmart.dppsmart.Skill.Services;

import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Skill.DTO.CreateSkillDto;
import com.dppsmart.dppsmart.Skill.DTO.SkillResponseDto;
import com.dppsmart.dppsmart.Skill.Entities.Skill;
import com.dppsmart.dppsmart.Skill.Repositories.SkillRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final UserRepository userRepository;

    public SkillResponseDto create(CreateSkillDto dto) {
        checkAdminOrSubAdmin();
        Skill skill = new Skill();
        skill.setName(dto.getName());
        skill.setDescription(dto.getDescription());
        skill.setCategory(dto.getCategory());
        skill.setActive(true);
        skill.setCreatedAt(LocalDateTime.now());
        skill.setUpdatedAt(LocalDateTime.now());
        return toDto(skillRepository.save(skill));
    }

    public SkillResponseDto update(String id, CreateSkillDto dto) {
        checkAdminOrSubAdmin();
        Skill skill = skillRepository.findById(id).orElseThrow(() -> new NotFoundException("Skill not found"));
        if (dto.getName() != null && !dto.getName().isBlank()) skill.setName(dto.getName());
        if (dto.getDescription() != null) skill.setDescription(dto.getDescription());
        if (dto.getCategory() != null) skill.setCategory(dto.getCategory());
        skill.setUpdatedAt(LocalDateTime.now());
        return toDto(skillRepository.save(skill));
    }

    public void delete(String id) {
        checkAdminOrSubAdmin();
        Skill skill = skillRepository.findById(id).orElseThrow(() -> new NotFoundException("Skill not found"));
        skill.setActive(false);
        skill.setUpdatedAt(LocalDateTime.now());
        skillRepository.save(skill);
    }

    public List<SkillResponseDto> getAll() {
        return skillRepository.findAll().stream().map(this::toDto).toList();
    }

    public List<SkillResponseDto> getActive() {
        return skillRepository.findByActiveTrue().stream().map(this::toDto).toList();
    }

    private SkillResponseDto toDto(Skill s) {
        SkillResponseDto dto = new SkillResponseDto();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setDescription(s.getDescription());
        dto.setCategory(s.getCategory());
        dto.setActive(s.isActive());
        dto.setCreatedAt(s.getCreatedAt());
        return dto;
    }

    private void checkAdminOrSubAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName()).orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE)
            throw new ForbiddenException("Access denied");
    }
}
