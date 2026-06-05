package com.dppsmart.dppsmart.Operations.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Operations.DTO.CreateOperationRequest;
import com.dppsmart.dppsmart.Operations.DTO.OperationDTO;
import com.dppsmart.dppsmart.Operations.DTO.UpdateOperationRequest;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.Operation;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationRepository;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationSheetItemRepository;
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
public class OperationsService {

    private final OperationRepository operationRepository;
    private final OperationSheetItemRepository operationSheetItemRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public OperationDTO create(CreateOperationRequest req) {
        User user = getCurrentUser();
        checkAccess(user, req.getOrganizationId());

        if (operationRepository.existsByNameAndOrganizationId(req.getName(), req.getOrganizationId())) {
            throw new BadRequestException("An operation with this name already exists in this organization");
        }

        Operation op = new Operation();
        op.setId(NanoIdUtils.randomNanoId());
        op.setName(req.getName());
        op.setDescription(req.getDescription());
        op.setEstimatedDuration(req.getEstimatedDuration());
        op.setDurationUnit(req.getDurationUnit());
        op.setResponsibleDepartment(req.getResponsibleDepartment());
        op.setRequiredResources(req.getRequiredResources());
        op.setExecutionCost(req.getExecutionCost());
        op.setCostCurrency(req.getCostCurrency());
        op.setActive(true);
        op.setOrganizationId(req.getOrganizationId());
        op.setCreatedBy(user.getEmail());
        op.setUpdatedBy(user.getEmail());
        op.setCreatedAt(LocalDateTime.now());
        op.setUpdatedAt(LocalDateTime.now());

        return toDto(operationRepository.save(op));
    }

    public OperationDTO getById(String id) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());
        return toDto(op);
    }

    public List<OperationDTO> getAll() {
        User user = getCurrentUser();
        return operationRepository.findAll().stream()
                .filter(op -> permissionService.canAccessOrganization(user, op.getOrganizationId()))
                .map(this::toDto)
                .toList();
    }

    public List<OperationDTO> getByOrg(String orgId) {
        User user = getCurrentUser();
        checkAccess(user, orgId);
        return operationRepository.findByOrganizationId(orgId).stream()
                .map(this::toDto)
                .toList();
    }

    public List<OperationDTO> getActiveByOrg(String orgId) {
        User user = getCurrentUser();
        checkAccess(user, orgId);
        return operationRepository.findByOrganizationIdAndActive(orgId, true).stream()
                .map(this::toDto)
                .toList();
    }

    public OperationDTO update(String id, UpdateOperationRequest req) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());

        if (req.getName() != null && !req.getName().isBlank()
                && !req.getName().equals(op.getName())
                && operationRepository.existsByNameAndOrganizationId(req.getName(), op.getOrganizationId())) {
            throw new BadRequestException("An operation with this name already exists in this organization");
        }

        if (req.getName() != null && !req.getName().isBlank()) op.setName(req.getName());
        if (req.getDescription() != null) op.setDescription(req.getDescription());
        if (req.getEstimatedDuration() != null) op.setEstimatedDuration(req.getEstimatedDuration());
        if (req.getDurationUnit() != null) op.setDurationUnit(req.getDurationUnit());
        if (req.getResponsibleDepartment() != null) op.setResponsibleDepartment(req.getResponsibleDepartment());
        if (req.getRequiredResources() != null) op.setRequiredResources(req.getRequiredResources());
        if (req.getExecutionCost() != null) op.setExecutionCost(req.getExecutionCost());
        if (req.getCostCurrency() != null) op.setCostCurrency(req.getCostCurrency());
        if (req.getActive() != null) op.setActive(req.getActive());
        op.setUpdatedBy(user.getEmail());
        op.setUpdatedAt(LocalDateTime.now());

        return toDto(operationRepository.save(op));
    }

    public OperationDTO deactivate(String id) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());
        op.setActive(false);
        op.setUpdatedBy(user.getEmail());
        op.setUpdatedAt(LocalDateTime.now());
        return toDto(operationRepository.save(op));
    }

    public OperationDTO activate(String id) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());
        op.setActive(true);
        op.setUpdatedBy(user.getEmail());
        op.setUpdatedAt(LocalDateTime.now());
        return toDto(operationRepository.save(op));
    }

    public void delete(String id) {
        User user = getCurrentUser();
        Operation op = operationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Operation not found"));
        checkAccess(user, op.getOrganizationId());

        if (operationSheetItemRepository.existsByOperationId(id)) {
            throw new BadRequestException("Cannot delete operation: it is referenced in one or more technical sheets. Deactivate it instead.");
        }

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

    private OperationDTO toDto(Operation op) {
        OperationDTO dto = new OperationDTO();
        dto.setId(op.getId());
        dto.setName(op.getName());
        dto.setDescription(op.getDescription());
        dto.setDefaultDuration(op.getDefaultDuration());
        dto.setEstimatedDuration(op.getEstimatedDuration());
        dto.setDurationUnit(op.getDurationUnit());
        dto.setResponsibleDepartment(op.getResponsibleDepartment());
        dto.setRequiredResources(op.getRequiredResources());
        dto.setExecutionCost(op.getExecutionCost());
        dto.setCostCurrency(op.getCostCurrency());
        dto.setActive(op.getActive() != null ? op.getActive() : true);
        dto.setOrganizationId(op.getOrganizationId());
        dto.setCreatedBy(op.getCreatedBy());
        dto.setUpdatedBy(op.getUpdatedBy());
        dto.setCreatedAt(op.getCreatedAt());
        dto.setUpdatedAt(op.getUpdatedAt());
        return dto;
    }
}
