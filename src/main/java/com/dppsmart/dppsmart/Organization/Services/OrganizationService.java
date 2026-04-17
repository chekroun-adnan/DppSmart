package com.dppsmart.dppsmart.Organization.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.DTO.AssignSubToMain;
import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.OrganizationResponseDto;
import com.dppsmart.dppsmart.Organization.DTO.UpdateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Mapper.OrganizationMapper;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
public class OrganizationService {

    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private UserRepository userRepository;

    public Organization createMainOrganization(CreateOrganizationDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getRole().equals(Roles.ADMIN)) {
            throw new RuntimeException("Only admin can create main organization");
        }

        // Create main organization
        Organization mainOrganization = new Organization();
        mainOrganization.setId(NanoIdUtils.randomNanoId());
        mainOrganization.setName(dto.getName());
        mainOrganization.setOrganizationType(OrganizationType.MAIN);
        mainOrganization.setCreatedByUserId(user.getId());

        List<String> subOrganizationIds = new ArrayList<>();

        Organization organization = organizationRepository.findByName(mainOrganization.getName());
        if (organization.getName().equals(mainOrganization.getName())) {
            throw new RuntimeException("Name Already there");
        }

        if (dto.getSubOrganizationNames() != null && !dto.getSubOrganizationNames().isEmpty()) {

            for (String subName : dto.getSubOrganizationNames()) {
                Organization subOrganization = new Organization();
                subOrganization.setId(NanoIdUtils.randomNanoId());
                subOrganization.setName(subName);
                subOrganization.setOrganizationType(OrganizationType.SUB);
                subOrganization.setParentOrganizationId(dto.getParentOrganizationId());
                subOrganization.setCreatedByUserId(user.getId());

                // Link sub to main
                subOrganization.setParentOrganizationId(mainOrganization.getId());

                Organization savedSub = organizationRepository.save(subOrganization);

                subOrganizationIds.add(savedSub.getId());
            }
        }

        // Assign subs to main
        mainOrganization.setSubOrganizationIds(subOrganizationIds);

        return organizationRepository.save(mainOrganization);
    }

    public Organization createSubOrganization(CreateOrganizationDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (dto.getParentOrganizationId() == null || dto.getParentOrganizationId().isBlank()) {
            throw new RuntimeException("Parent organization ID is required");
        }

        Organization parent = organizationRepository
                .findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new RuntimeException("Parent organization not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("Sub organization can only be attached to a MAIN organization");
        }

        Organization subOrganization = new Organization();
        subOrganization.setId(NanoIdUtils.randomNanoId());
        subOrganization.setName(dto.getName());
        subOrganization.setParentOrganizationId(parent.getId());
        subOrganization.setCreatedByUserId(user.getId());
        subOrganization.setOrganizationType(OrganizationType.SUB);

        Organization savedSub = organizationRepository.save(subOrganization);

        // optional: update parent with child id
        if (parent.getSubOrganizationIds() == null) {
            parent.setSubOrganizationIds(new ArrayList<>());
        }

        parent.getSubOrganizationIds().add(savedSub.getId());
        organizationRepository.save(parent);

        return savedSub;
    }

    public Organization assignSubToMain(AssignSubToMain dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Find parent organization
        Organization parent = organizationRepository
                .findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new RuntimeException("Parent organization not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("Sub organization can only be attached to a MAIN organization");
        }

        // Find sub organization
        Organization sub = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Sub organization not found"));

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new RuntimeException("Only SUB organizations can be assigned");
        }

        // Initialize list if null
        if (parent.getSubOrganizationIds() == null) {
            parent.setSubOrganizationIds(new ArrayList<>());
        }

        // Avoid duplicates
        if (!parent.getSubOrganizationIds().contains(sub.getId())) {
            parent.getSubOrganizationIds().add(sub.getId());
        }

        // Update child parent reference
        sub.setParentOrganizationId(parent.getId());
        organizationRepository.save(sub);

        // Save parent
        return organizationRepository.save(parent);
    }

    public Organization updateMainOrganization(UpdateOrganizationDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Organization main = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Main organization not found"));

        if (main.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("This organization is not a MAIN organization");
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            main.setName(dto.getName());
        }

        return organizationRepository.save(main);
    }


    public Organization updateSubOrganization(UpdateOrganizationDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Organization sub = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Sub organization not found"));

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new RuntimeException("This organization is not a SUB organization");
        }

        // Update name
        if (dto.getName() != null && !dto.getName().isBlank()) {
            sub.setName(dto.getName());
        }

        // Update parent if provided
        if (dto.getParentOrganizationId() != null &&
                !dto.getParentOrganizationId().isBlank()) {

            Organization newParent = organizationRepository
                    .findById(dto.getParentOrganizationId())
                    .orElseThrow(() -> new RuntimeException("New parent organization not found"));

            if (newParent.getOrganizationType() != OrganizationType.MAIN) {
                throw new RuntimeException("Parent must be a MAIN organization");
            }

            // Remove sub from old parent
            if (sub.getParentOrganizationId() != null) {
                organizationRepository.findById(sub.getParentOrganizationId())
                        .ifPresent(oldParent -> {
                            if (oldParent.getSubOrganizationIds() != null) {
                                oldParent.getSubOrganizationIds().remove(sub.getId());
                                organizationRepository.save(oldParent);
                            }
                        });
            }

            // Add sub to new parent
            if (newParent.getSubOrganizationIds() == null) {
                newParent.setSubOrganizationIds(new ArrayList<>());
            }

            if (!newParent.getSubOrganizationIds().contains(sub.getId())) {
                newParent.getSubOrganizationIds().add(sub.getId());
            }

            organizationRepository.save(newParent);

            sub.setParentOrganizationId(newParent.getId());
        }

        return organizationRepository.save(sub);
    }

    public List<Organization> getAllMainOrganizations() {
        return organizationRepository.findAll()
                .stream()
                .filter(org -> org.getOrganizationType() == OrganizationType.MAIN)
                .toList();
    }

    public List<Organization> getAllSubOrganizations() {
        return organizationRepository.findAll()
                .stream()
                .filter(org -> org.getOrganizationType() == OrganizationType.SUB)
                .toList();
    }
}
