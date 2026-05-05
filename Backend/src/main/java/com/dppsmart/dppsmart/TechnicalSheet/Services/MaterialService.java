package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.CreateMaterialDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.MaterialResponseDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.UpdateMaterialDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Material;
import com.dppsmart.dppsmart.TechnicalSheet.Mapper.TechnicalSheetModuleMapper;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.MaterialRepository;
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
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public MaterialResponseDto create(CreateMaterialDto dto) {
        User user = getCurrentUser();
        checkAccess(user, dto.getOrganizationId());

        Material m = new Material();
        m.setId(NanoIdUtils.randomNanoId());
        m.setName(dto.getName());
        m.setReferenceCode(dto.getReferenceCode());
        m.setUnit(dto.getUnit());
        m.setOrganizationId(dto.getOrganizationId());
        m.setCreatedBy(user.getEmail());
        m.setCreatedAt(LocalDateTime.now());
        m.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(materialRepository.save(m));
    }

    public List<MaterialResponseDto> getByOrg(String orgId) {
        User user = getCurrentUser();
        checkAccess(user, orgId);
        return materialRepository.findByOrganizationId(orgId).stream()
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public List<MaterialResponseDto> getAll() {
        User user = getCurrentUser();
        return materialRepository.findAll().stream()
                .filter(m -> permissionService.canAccessOrganization(user, m.getOrganizationId()))
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public MaterialResponseDto update(String id, UpdateMaterialDto dto) {
        User user = getCurrentUser();
        Material m = materialRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material not found"));
        checkAccess(user, m.getOrganizationId());
        if (dto.getName() != null && !dto.getName().isBlank()) m.setName(dto.getName());
        if (dto.getReferenceCode() != null) m.setReferenceCode(dto.getReferenceCode());
        if (dto.getUnit() != null && !dto.getUnit().isBlank()) m.setUnit(dto.getUnit());
        m.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(materialRepository.save(m));
    }

    public void delete(String id) {
        User user = getCurrentUser();
        Material m = materialRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material not found"));
        checkAccess(user, m.getOrganizationId());
        materialRepository.deleteById(id);
    }

    private void checkAccess(User user, String orgId) {
        if (!permissionService.canAccessOrganization(user, orgId))
            throw new ForbiddenException("Access denied to this organization");
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
