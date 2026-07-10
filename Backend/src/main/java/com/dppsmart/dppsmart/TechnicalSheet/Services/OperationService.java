package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.Services.OrdersService;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperationService {

    private final OperationRepository operationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final com.dppsmart.dppsmart.TechnicalSheet.Repositories.OperationSheetItemRepository operationSheetItemRepository;
    private OrdersService ordersService;

    @Autowired
    public void setOrdersService(@Lazy OrdersService ordersService) {
        this.ordersService = ordersService;
    }

    public OperationResponseDto create(CreateOperationDto dto) {
        User user = getCurrentUser();
        checkAccess(user, dto.getOrganizationId());

        Operation op = new Operation();
        op.setId(NanoIdUtils.randomNanoId());
        op.setName(dto.getName());
        op.setDescription(dto.getDescription());
        op.setDefaultDuration(dto.getDefaultDuration());
        op.setEstimatedDuration(dto.getEstimatedDuration());
        op.setDurationUnit(dto.getDurationUnit());
        op.setResponsibleDepartment(dto.getResponsibleDepartment());
        op.setRequiredResources(dto.getRequiredResources());
        op.setExecutionCost(dto.getExecutionCost());
        op.setCostPerMinute(dto.getCostPerMinute());
        op.setCostCurrency(dto.getCostCurrency());
        op.setActive(true);
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
        Double oldCostPerMinute = op.getCostPerMinute();
        if (dto.getName() != null && !dto.getName().isBlank()) op.setName(dto.getName());
        if (dto.getDescription() != null) op.setDescription(dto.getDescription());
        if (dto.getDefaultDuration() != null) op.setDefaultDuration(dto.getDefaultDuration());
        if (dto.getEstimatedDuration() != null) op.setEstimatedDuration(dto.getEstimatedDuration());
        if (dto.getDurationUnit() != null) op.setDurationUnit(dto.getDurationUnit());
        if (dto.getResponsibleDepartment() != null) op.setResponsibleDepartment(dto.getResponsibleDepartment());
        if (dto.getRequiredResources() != null) op.setRequiredResources(dto.getRequiredResources());
        if (dto.getExecutionCost() != null) op.setExecutionCost(dto.getExecutionCost());
        if (dto.getCostPerMinute() != null) op.setCostPerMinute(dto.getCostPerMinute());
        if (dto.getCostCurrency() != null) op.setCostCurrency(dto.getCostCurrency());
        op.setUpdatedAt(LocalDateTime.now());
        OperationResponseDto result = TechnicalSheetModuleMapper.toDto(operationRepository.save(op));
        boolean priceChanged = dto.getCostPerMinute() != null
                && (oldCostPerMinute == null || Double.compare(dto.getCostPerMinute(), oldCostPerMinute) != 0);
        if (priceChanged) {
            try {
                List<com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem> sheetItems = operationSheetItemRepository.findByOperationId(op.getId());
                if (!sheetItems.isEmpty()) {
                    for (com.dppsmart.dppsmart.TechnicalSheet.Entities.OperationSheetItem item : sheetItems) {
                        item.setCostPerMinute(op.getCostPerMinute());
                        item.setCostCurrency(op.getCostCurrency());
                    }
                    operationSheetItemRepository.saveAll(sheetItems);
                }
                ordersService.recalculateCostsForAllOpenOrders(op.getOrganizationId());
            } catch (Exception e) {
                log.warn("Failed to recalculate order costs after costPerMinute change for operation {}: {}", id, e.getMessage());
            }
        }
        return result;
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
