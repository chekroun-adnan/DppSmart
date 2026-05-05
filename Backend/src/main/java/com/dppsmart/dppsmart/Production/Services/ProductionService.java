package com.dppsmart.dppsmart.Production.Services;


import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Production.DTO.CreateProductionDto;
import com.dppsmart.dppsmart.Production.DTO.ProductionResponseDto;
import com.dppsmart.dppsmart.Production.DTO.UpdateProductionStatusDto;
import com.dppsmart.dppsmart.Production.Entities.Production;
import com.dppsmart.dppsmart.Production.Entities.ProductionStatus;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Production.Mapper.ProductionMapper;
import com.dppsmart.dppsmart.Production.Repositories.ProductionRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductionService {

    @Autowired
    private ProductionRepository productionRepository;
    @Autowired
    private ProductionMapper productionMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private PermissionService permissionService;

    public ProductionResponseDto create(CreateProductionDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to create productions");
        }

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Production production = Production.builder()
                .productId(dto.getProductId())
                .organizationId(organization.getId())
                .quantity(dto.getQuantity())
                .steps(dto.getSteps())
                .status(ProductionStatus.PLANNED)
                .createdAt(LocalDateTime.now())
                .build();

        return productionMapper.toDto(productionRepository.save(production));
    }


    public List<ProductionResponseDto> getAll() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to access productions");
        }

        return productionRepository.findAll()
                .stream()
                .filter(p -> permissionService.canAccessOrganization(user, p.getOrganizationId()))
                .map(productionMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<ProductionResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to access productions");
        }
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return productionRepository.findByOrganizationId(organizationId)
                .stream()
                .map(productionMapper::toDto)
                .collect(Collectors.toList());
    }

    public ProductionResponseDto updateStatus(String id, UpdateProductionStatusDto dto) {

        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update productions");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this production");
        }
        production.setStatus(dto.getStatus());

        return productionMapper.toDto(productionRepository.save(production));
    }

    public ProductionResponseDto startStep(String productionId, int stepIndex) {

        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update productions");
        }
        Production production = getProduction(productionId);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this production");
        }

        ProductionStep step = production.getSteps().get(stepIndex);
        step.setStartDate(LocalDateTime.now());
        step.setCompleted(false);

        production.setStatus(ProductionStatus.IN_PROGRESS);

        return productionMapper.toDto(productionRepository.save(production));
    }

    public ProductionResponseDto completeStep(String productionId, int stepIndex) {

        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update productions");
        }
        Production production = getProduction(productionId);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this production");
        }

        ProductionStep step = production.getSteps().get(stepIndex);
        step.setEndDate(LocalDateTime.now());
        step.setCompleted(true);

        boolean allDone = production.getSteps()
                .stream()
                .allMatch(ProductionStep::isCompleted);

        production.setStatus(
                allDone ? ProductionStatus.COMPLETED : ProductionStatus.IN_PROGRESS
        );

        return productionMapper.toDto(productionRepository.save(production));
    }

    public void delete(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to delete productions");
        }
        Production production = getProduction(id);
        if (!permissionService.canAccessOrganization(user, production.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this production");
        }
        productionRepository.deleteById(id);
    }

    private Production getProduction(String id) {
        return productionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Production not found"));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
