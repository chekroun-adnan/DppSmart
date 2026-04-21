package com.dppsmart.dppsmart.Organization.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.DTO.AssignSubToMain;
import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.UpdateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
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

    // ===================== CREATE MAIN =====================
    public Organization createMainOrganization(CreateOrganizationDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getRole().equals(Roles.ADMIN)) {
            throw new RuntimeException("Only admin can create main organization");
        }

        if (organizationRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Organization name already exists");
        }

        Organization main = new Organization();
        main.setId(NanoIdUtils.randomNanoId());
        main.setName(dto.getName());
        main.setOrganizationType(OrganizationType.MAIN);
        main.setCreatedByUserId(user.getId());

        return organizationRepository.save(main);
    }

    // ===================== CREATE SUB =====================
    public Organization createSubOrganization(CreateOrganizationDto dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Organization parent = organizationRepository.findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new RuntimeException("Parent not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("Parent must be MAIN");
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

        parent.getSubOrganizationIds().add(savedSub.getId());
        organizationRepository.save(parent);

        return savedSub;
    }

    // ===================== ASSIGN SUB TO MAIN =====================
    public Organization assignSubToMain(AssignSubToMain dto) {

        Organization parent = organizationRepository.findById(dto.getParentOrganizationId())
                .orElseThrow(() -> new RuntimeException("Parent not found"));

        Organization sub = organizationRepository.findById(dto.getSubOrganizationId())
                .orElseThrow(() -> new RuntimeException("Sub not found"));

        if (parent.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("Parent must be MAIN");
        }

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new RuntimeException("Only SUB can be assigned");
        }

        sub.setParentOrganizationId(parent.getId());

        return organizationRepository.save(sub);
    }

    // ===================== UPDATE MAIN =====================
    public Organization updateMainOrganization(UpdateOrganizationDto dto) {

        Organization main = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Main not found"));

        if (main.getOrganizationType() != OrganizationType.MAIN) {
            throw new RuntimeException("Not MAIN org");
        }

        if (dto.getName() != null) {
            main.setName(dto.getName());
        }

        return organizationRepository.save(main);
    }

    // ===================== UPDATE SUB =====================
    public Organization updateSubOrganization(UpdateOrganizationDto dto) {

        Organization sub = organizationRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Sub not found"));

        if (sub.getOrganizationType() != OrganizationType.SUB) {
            throw new RuntimeException("Not SUB org");
        }

        if (dto.getName() != null) {
            sub.setName(dto.getName());
        }

        if (dto.getParentOrganizationId() != null) {

            Organization newParent = organizationRepository.findById(dto.getParentOrganizationId())
                    .orElseThrow(() -> new RuntimeException("Parent not found"));

            if (newParent.getOrganizationType() != OrganizationType.MAIN) {
                throw new RuntimeException("Parent must be MAIN");
            }

            sub.setParentOrganizationId(newParent.getId());
        }

        return organizationRepository.save(sub);
    }

    // ===================== GET MAIN ORGS =====================
    public List<Organization> getAllMainOrganizations() {
        return organizationRepository.findByOrganizationType(OrganizationType.MAIN);
    }

    // ===================== GET SUB ORGS =====================
    public List<Organization> getAllSubOrganizations() {
        return organizationRepository.findByOrganizationType(OrganizationType.SUB);
    }

    // ===================== GET SUBS OF MAIN =====================
    public List<Organization> getSubsByMain(String mainId) {
        return organizationRepository.findByParentOrganizationId(mainId);
    }
}