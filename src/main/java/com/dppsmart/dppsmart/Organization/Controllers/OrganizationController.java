package com.dppsmart.dppsmart.Organization.Controllers;

import com.dppsmart.dppsmart.Organization.DTO.AssignSubToMain;
import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.UpdateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Services.OrganizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/organization")
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;


    @PostMapping("/main/create")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<?> createMainOrganization(@RequestBody CreateOrganizationDto organization){
        organizationService.createMainOrganization(organization);
        return ResponseEntity.ok("Organization Created Successfully");
    }

    @PostMapping("/sub/create")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?>createSubOrganization(@RequestBody  CreateOrganizationDto dto){
        organizationService.createSubOrganization(dto);
        return ResponseEntity.ok("Organization Created Successfully");
    }


    @PostMapping("/assign-sub")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Organization> assignSubToMain(
            @RequestBody AssignSubToMain dto) {

        return ResponseEntity.ok(
                organizationService.assignSubToMain(dto)
        );
    }


    @PutMapping("/update/main")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Organization> updateMain(
            @RequestBody UpdateOrganizationDto dto) {
        return ResponseEntity.ok(organizationService.updateMainOrganization(dto));
    }

    @PutMapping("/update/sub")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<Organization> updateSub(
            @RequestBody UpdateOrganizationDto dto) {
        return ResponseEntity.ok(organizationService.updateSubOrganization(dto));
    }

    @GetMapping("/main/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllMainOrganizations(){
        List<Organization> organizations = organizationService.getAllMainOrganizations();
        return ResponseEntity.status(HttpStatus.CREATED).body(organizations);
    }

    @GetMapping("/sub/all")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> getAllSubOrganizations(){
        List<Organization> organizations = organizationService.getAllSubOrganizations();
        return ResponseEntity.status(HttpStatus.CREATED).body(organizations);
    }

    @GetMapping("/subs/{mainId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Organization>> getSubsByMain(@PathVariable String mainId) {
        List<Organization> subs = organizationService.getSubsByMain(mainId);
        return ResponseEntity.ok(subs);
    }
}
