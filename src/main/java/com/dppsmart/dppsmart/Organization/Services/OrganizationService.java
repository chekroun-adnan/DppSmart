package com.dppsmart.dppsmart.Organization.Services;

import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.User.Services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class OrganizationService {

    @Autowired
    private AuthService authService;
    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private UserRepository userRepository;


    public Organization createOrganization(CreateOrganizationDto dto) {
        if (dto.getType() == null) {
            throw new RuntimeException("Organization type is required");
        }

        Authentication auth = SecurityContextHolder
                .getContext()
                .getAuthentication();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == Roles.SUBADMIN
                && dto.getType() == OrganizationType.MAIN) {
            throw new RuntimeException("Subadmin can only create sub organizations");
        }

        if (dto.getType() == OrganizationType.SUB
                && dto.getParentOrganizationId() == null) {
            throw new RuntimeException("Sub organization must have a parent");
        }

        if (dto.getType() == OrganizationType.MAIN
                && dto.getParentOrganizationId() != null) {
            throw new RuntimeException("Main organization cannot have a parent");
        }

        Organization organization = new Organization();
        organization.setName(dto.getName());
        organization.setOrganizationType(dto.getType());
        organization.setParentOrganizationId(dto.getParentOrganizationId());
        organization.setCreatedByUserId(user.getId());

        return organizationRepository.save(organization);
    }



}
