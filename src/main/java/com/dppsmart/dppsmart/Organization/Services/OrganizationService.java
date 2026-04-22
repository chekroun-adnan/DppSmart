package com.dppsmart.dppsmart.Organization.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Organization.DTO.AssignSubToMain;
import com.dppsmart.dppsmart.Organization.DTO.AssignUserToOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.OrganizationResponseDto;
import com.dppsmart.dppsmart.Organization.DTO.UpdateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Mapper.OrganizationMapper;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public OrganizationResponseDto createMainOrganization(CreateOrganizationDto dto) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user)) {
            throw new ForbiddenException("Only ADMIN can create a main organization");
        }
        if (organizationRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Organization name already exists");
        }

        Organization main = new Organization();
        main.setId(NanoIdUtils.randomNanoId());
        main.setName(dto.getName());
        main.setOrganizationType(OrganizationType.MAIN);
        main.setCreatedByUserId(user.getId());

        return OrganizationMapper.toDto(organizationRepository.save(main));
    }

    public OrganizationResponseDto createSubOrganization(CreateOrganizationDto dto) {
        User user = getCurrentUser();

        if (dto.getParentOrganizationId() == null || dto.getParentOrganizationId().isBlank()) {
            throw new BadRequestException("parentOrganizationId is required for SUB organization");
        }

        Organization parent = organizationRepository.findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new NotFoundException("Parent organization not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new BadRequestException("Parent organization must be MAIN");
        }

        if (user.getRole() == Roles.SUBADMIN && !permissionService.canAccessOrganization(user, parent.getId())) {
            throw new ForbiddenException("SUBADMIN can only create sub-organizations under assigned main organizations");
        }

        if (organizationRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Organization name already exists");
        }

        Organization sub = new Organization();
        sub.setId(NanoIdUtils.randomNanoId());
        sub.setName(dto.getName());
        sub.setOrganizationType(OrganizationType.SUB);
        sub.setParentOrganizationId(parent.getId());
        sub.setCreatedByUserId(user.getId());

        Organization savedSub = organizationRepository.save(sub);

        if (parent.getSubOrganizationIds() == null) {
            parent.setSubOrganizationIds(new ArrayList<>());
        }
        if (!parent.getSubOrganizationIds().contains(savedSub.getId())) {
            parent.getSubOrganizationIds().add(savedSub.getId());
            organizationRepository.save(parent);
        }

        return OrganizationMapper.toDto(savedSub);
    }

    public OrganizationResponseDto assignSubToMain(AssignSubToMain dto) {
        User user = getCurrentUser();

        Organization parent = organizationRepository.findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new NotFoundException("Parent organization not found"));

        Organization sub = organizationRepository.findById(dto.getSubOrganizationId())
                .orElseThrow(() -> new NotFoundException("Sub organization not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new BadRequestException("Parent organization must be MAIN");
        }

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new BadRequestException("Only SUB organizations can be assigned to a MAIN");
        }

        if (user.getRole() == Roles.SUBADMIN && !permissionService.canAccessOrganization(user, parent.getId())) {
            throw new ForbiddenException("SUBADMIN can only manage assigned organizations");
        }

        String oldParentId = sub.getParentOrganizationId();
        sub.setParentOrganizationId(parent.getId());
        Organization savedSub = organizationRepository.save(sub);

        if (oldParentId != null && !oldParentId.equals(parent.getId())) {
            organizationRepository.findById(oldParentId).ifPresent(oldParent -> {
                if (oldParent.getSubOrganizationIds() != null) {
                    oldParent.getSubOrganizationIds().removeIf(id -> id.equals(savedSub.getId()));
                    organizationRepository.save(oldParent);
                }
            });
        }

        if (parent.getSubOrganizationIds() == null) parent.setSubOrganizationIds(new ArrayList<>());
        if (!parent.getSubOrganizationIds().contains(savedSub.getId())) {
            parent.getSubOrganizationIds().add(savedSub.getId());
            organizationRepository.save(parent);
        }

        return OrganizationMapper.toDto(savedSub);
    }

    public OrganizationResponseDto updateMainOrganization(UpdateOrganizationDto dto) {
        Organization main = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (main.getOrganizationType() != OrganizationType.MAIN) {
            throw new BadRequestException("Organization is not MAIN");
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            main.setName(dto.getName());
        }

        return OrganizationMapper.toDto(organizationRepository.save(main));
    }

    public OrganizationResponseDto updateSubOrganization(UpdateOrganizationDto dto) {
        User user = getCurrentUser();

        Organization sub = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new BadRequestException("Organization is not SUB");
        }

        if (user.getRole() == Roles.SUBADMIN && !permissionService.canAccessOrganization(user, sub.getId())) {
            throw new ForbiddenException("SUBADMIN can only update assigned organizations");
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            sub.setName(dto.getName());
        }

        if (dto.getParentOrganizationId() != null && !dto.getParentOrganizationId().isBlank()) {
            Organization newParent = organizationRepository.findById(dto.getParentOrganizationId())
                    .orElseThrow(() -> new NotFoundException("Parent organization not found"));

            if (newParent.getOrganizationType() != OrganizationType.MAIN) {
                throw new BadRequestException("Parent organization must be MAIN");
            }

            AssignSubToMain assignDto = new AssignSubToMain();
            assignDto.setParentOrganizationId(newParent.getId());
            assignDto.setSubOrganizationId(sub.getId());
            return assignSubToMain(assignDto);
        }

        return OrganizationMapper.toDto(organizationRepository.save(sub));
    }

    public List<OrganizationResponseDto> getAllMainOrganizations() {
        return organizationRepository.findByOrganizationType(OrganizationType.MAIN)
                .stream()
                .map(OrganizationMapper::toDto)
                .toList();
    }

    public List<OrganizationResponseDto> getAllSubOrganizations() {
        User user = getCurrentUser();

        List<Organization> subs = organizationRepository.findByOrganizationType(OrganizationType.SUB);
        if (permissionService.isAdmin(user)) {
            return subs.stream().map(OrganizationMapper::toDto).toList();
        }

        return subs.stream()
                .filter(o -> permissionService.canAccessOrganization(user, o.getId()))
                .map(OrganizationMapper::toDto)
                .toList();
    }

    public List<OrganizationResponseDto> getSubsByMain(String mainId) {
        return organizationRepository.findByParentOrganizationId(mainId)
                .stream()
                .map(OrganizationMapper::toDto)
                .toList();
    }

    public OrganizationResponseDto getById(String id) {
        User user = getCurrentUser();
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, org.getId())) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return OrganizationMapper.toDto(org);
    }

    public void delete(String id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (org.getOrganizationType() == OrganizationType.MAIN) {
            List<Organization> subs = organizationRepository.findByParentOrganizationId(org.getId());
            if (!subs.isEmpty()) {
                throw new BadRequestException("Cannot delete MAIN organization with existing sub-organizations");
            }
        }

        organizationRepository.deleteById(org.getId());
    }

    public void assignUserToOrganization(AssignUserToOrganizationDto dto) {
        Organization org = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (user.getAssignedOrganizationIds() == null) {
            user.setAssignedOrganizationIds(new ArrayList<>());
        }
        if (!user.getAssignedOrganizationIds().contains(org.getId())) {
            user.getAssignedOrganizationIds().add(org.getId());
        }
        if (user.getOrganizationId() == null) {
            user.setOrganizationId(org.getId());
        }

        userRepository.save(user);
    }

    public List<OrganizationResponseDto> getOrganizationsByUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return resolveUserOrganizations(user).stream().map(OrganizationMapper::toDto).toList();
    }

    public List<OrganizationResponseDto> getMyOrganizations() {
        User user = getCurrentUser();
        return resolveUserOrganizations(user).stream().map(OrganizationMapper::toDto).toList();
    }

    private List<Organization> resolveUserOrganizations(User user) {
        List<String> ids = new ArrayList<>();
        if (user.getOrganizationId() != null) ids.add(user.getOrganizationId());
        if (user.getAssignedOrganizationIds() != null) ids.addAll(user.getAssignedOrganizationIds());

        return ids.stream()
                .distinct()
                .map(id -> organizationRepository.findById(id).orElse(null))
                .filter(o -> o != null)
                .toList();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}