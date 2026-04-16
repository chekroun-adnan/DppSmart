package com.dppsmart.dppsmart.Organization.Controllers;

import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Services.OrganizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/organization")
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;

    @PreAuthorize("hasAnyRole('ADMIN', 'SUBADMIN')")
    @PostMapping("/create")
    public ResponseEntity<?> createOrganization(@RequestBody CreateOrganizationDto organization){
        organizationService.createOrganization(organization);
        return ResponseEntity.ok("Organization Created Successfully");
    }
}
