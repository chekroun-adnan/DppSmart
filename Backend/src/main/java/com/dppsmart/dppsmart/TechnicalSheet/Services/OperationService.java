package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.CreateOperationDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.OperationResponseDto;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.UpdateOperationDto;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import com.dppsmart.dppsmart.TechnicalSheet.Mapper.TechnicalSheetModuleMapper;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationRepository;
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
public class OperationService {

    private final OperationRepository operationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public OperationResponseDto create(CreateOperationDto dto) {
        User user = getCurrentUser();
        checkAccess(user, dto.getOrganizationId());

        Operation op = new Operation();
        op.setId(NanoIdUtils.randomNanoId());
        op.setName(dto.getName());
        op.setDescription(dto.getDescription());
        op.setDefaultDuration(dto.getDefaultDuration());
        op.setOrganizationId(dto.getOrganizationId());
        op.setCreatedBy(user.getEmail());
        op.setCreatedAt(LocalDateTime.now());
        op.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(operationRepository.save(op));
    }

    public List<OperationResponseDto> getByOrg(String orgId) {
        User user = getCurrentUser();
        checkAccess(user, orgId);
        return operationRepository.findByOrganizationId(orgId).stream()
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public List<OperationResponseDto> getAll() {
        User user = getCurrentUser();
        return operationRepository.findAll().stream()
                .filter(op -> permissionService.canAccessOrganization(user, op.getOrganizationId()))
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public OperationResponseDto update(String id, UpdateOperationDto dto) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());
        if (dto.getName() != null && !dto.getName().isBlank()) op.setName(dto.getName());
        if (dto.getDescription() != null) op.setDescription(dto.getDescription());
        if (dto.getDefaultDuration() != null) op.setDefaultDuration(dto.getDefaultDuration());
        op.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(operationRepository.save(op));
    }

    public void delete(String id) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());
        operationRepository.deleteById(id);
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
