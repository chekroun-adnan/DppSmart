package com.dppsmart.dppsmart.Skill.Controllers;

import com.dppsmart.dppsmart.Skill.DTO.CreateSkillDto;
import com.dppsmart.dppsmart.Skill.DTO.SkillResponseDto;
import com.dppsmart.dppsmart.Skill.Services.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SkillResponseDto> create(@RequestBody @Valid CreateSkillDto dto) {
        return ResponseEntity.ok(skillService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<SkillResponseDto> update(@PathVariable String id, @RequestBody CreateSkillDto dto) {
        return ResponseEntity.ok(skillService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        skillService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<SkillResponseDto>> getAll() {
        return ResponseEntity.ok(skillService.getAll());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE')")
    public ResponseEntity<List<SkillResponseDto>> getActive() {
        return ResponseEntity.ok(skillService.getActive());
    }
}
