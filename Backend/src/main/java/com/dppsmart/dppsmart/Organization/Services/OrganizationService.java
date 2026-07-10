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
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final NotificationServiceImpl notificationService;

    @CacheEvict(value = {"organizations", "allMainOrganizations", "allSubOrganizations", "userOrganizations"}, allEntries = true)
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

        Organization saved = organizationRepository.save(main);

        notificationService.createNotification(
                user.getId(),
                "Main Organization Created",
                dto.getName() + " has been created",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations"
        );

        return OrganizationMapper.toDto(saved);
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

        if (user.getRole() == Roles.SUBADMIN) {
            if (user.getAssignedOrganizationIds() == null) {
                user.setAssignedOrganizationIds(new ArrayList<>());
            }
            if (!user.getAssignedOrganizationIds().contains(savedSub.getId())) {
                user.getAssignedOrganizationIds().add(savedSub.getId());
                userRepository.save(user);
            }
        }

        notificationService.createNotification(
                user.getId(),
                "Sub Organization Created",
                dto.getName() + " has been created under " + parent.getName(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations/" + savedSub.getId()
        );

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

        Organization saved = organizationRepository.save(main);

        notificationService.createNotification(
                getCurrentUser().getId(),
                "Organization Updated",
                main.getName() + " has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations/" + main.getId()
        );

        return OrganizationMapper.toDto(saved);
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

        notificationService.createNotification(
                user.getId(),
                "Sub Organization Updated",
                sub.getName() + " has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations/" + sub.getId()
            );

        return OrganizationMapper.toDto(organizationRepository.save(sub));
    }

    @Cacheable(value = "allMainOrganizations")
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

    @Cacheable(value = "organizations", key = "#id")
    public OrganizationResponseDto getById(String id) {
        User user = getCurrentUser();
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, org.getId())) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return OrganizationMapper.toDto(org);
    }

    @CacheEvict(value = {"organizations", "allMainOrganizations", "allSubOrganizations", "userOrganizations"}, allEntries = true)
    public void delete(String id) {
        User user = getCurrentUser();
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.SUBADMIN) {
            if (org.getOrganizationType() == OrganizationType.MAIN) {
                throw new ForbiddenException("SUBADMIN cannot delete main organizations");
            }
            if (!permissionService.canAccessOrganization(user, org.getId())) {
                throw new ForbiddenException("SUBADMIN can only delete assigned sub-organizations");
            }
        }

        if (org.getOrganizationType() == OrganizationType.MAIN) {
            List<Organization> subs = organizationRepository.findByParentOrganizationId(org.getId());
            if (!subs.isEmpty()) {
                throw new BadRequestException("Cannot delete MAIN organization with existing sub-organizations");
            }
        }

        if (org.getOrganizationType() == OrganizationType.SUB) {
            userRepository.findAll().forEach(u -> {
                if (u.getAssignedOrganizationIds() != null && u.getAssignedOrganizationIds().contains(org.getId())) {
                    u.getAssignedOrganizationIds().remove(org.getId());
                    userRepository.save(u);
                }
            });
        }

        organizationRepository.deleteById(org.getId());

        notificationService.createNotification(
                user.getId(),
                "Organization Deleted",
                org.getName() + " has been deleted",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations"
        );
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

        notificationService.createNotification(
                user.getId(),
                "User Assigned to Organization",
                dto.getUserId() + " has been assigned to " + org.getName(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.SYSTEM,
                "/organizations/" + org.getId()
            );
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


    public Map<String, Object> getBankDetails(String organizationId) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found: " + organizationId));

        Map<String, Object> details = new java.util.LinkedHashMap<>();
        details.put("bankName", org.getBankName());
        details.put("accountHolder", org.getAccountHolder());
        details.put("accountNumber", org.getAccountNumber());
        details.put("iban", org.getIban());
        details.put("swiftCode", org.getSwiftCode());
        return details;
    }

    public Map<String, Object> updateBankDetails(String organizationId, Map<String, String> bankDetails) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found: " + organizationId));

        if (bankDetails.containsKey("bankName")) org.setBankName(bankDetails.get("bankName"));
        if (bankDetails.containsKey("accountHolder")) org.setAccountHolder(bankDetails.get("accountHolder"));
        if (bankDetails.containsKey("accountNumber")) org.setAccountNumber(bankDetails.get("accountNumber"));
        if (bankDetails.containsKey("iban")) org.setIban(bankDetails.get("iban"));
        if (bankDetails.containsKey("swiftCode")) org.setSwiftCode(bankDetails.get("swiftCode"));

        organizationRepository.save(org);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("bankName", org.getBankName());
        result.put("accountHolder", org.getAccountHolder());
        result.put("accountNumber", org.getAccountNumber());
        result.put("iban", org.getIban());
        result.put("swiftCode", org.getSwiftCode());
        result.put("message", "Bank details updated successfully");
        return result;
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