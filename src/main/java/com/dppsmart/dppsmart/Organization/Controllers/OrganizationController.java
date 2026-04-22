package com.dppsmart.dppsmart.Organization.Controllers;

import com.dppsmart.dppsmart.Organization.DTO.AssignSubToMain;
import com.dppsmart.dppsmart.Organization.DTO.AssignUserToOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.OrganizationResponseDto;
import com.dppsmart.dppsmart.Organization.DTO.UpdateOrganizationDto;
import com.dppsmart.dppsmart.Organization.Services.OrganizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/organization")
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;


    @PostMapping("/main/create")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<?> createMainOrganization(@RequestBody @Valid CreateOrganizationDto organization){
        OrganizationResponseDto created = organizationService.createMainOrganization(organization);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/sub/create")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> createSubOrganization(@RequestBody @Valid CreateOrganizationDto dto){
        OrganizationResponseDto created = organizationService.createSubOrganization(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    @PostMapping("/assign-sub")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrganizationResponseDto> assignSubToMain(
            @RequestBody @Valid AssignSubToMain dto) {
        return ResponseEntity.ok(organizationService.assignSubToMain(dto));
    }


    @PutMapping("/update/main")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganizationResponseDto> updateMain(
            @RequestBody @Valid UpdateOrganizationDto dto) {
        return ResponseEntity.ok(organizationService.updateMainOrganization(dto));
    }

    @PutMapping("/update/sub")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrganizationResponseDto> updateSub(
            @RequestBody @Valid UpdateOrganizationDto dto) {
        return ResponseEntity.ok(organizationService.updateSubOrganization(dto));
    }

    @GetMapping("/main/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrganizationResponseDto>> getAllMainOrganizations(){
        return ResponseEntity.ok(organizationService.getAllMainOrganizations());
    }

    @GetMapping("/sub/all")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<List<OrganizationResponseDto>> getAllSubOrganizations(){
        return ResponseEntity.ok(organizationService.getAllSubOrganizations());
    }

    @GetMapping("/subs/{mainId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrganizationResponseDto>> getSubsByMain(@PathVariable String mainId) {
        return ResponseEntity.ok(organizationService.getSubsByMain(mainId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<OrganizationResponseDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(organizationService.getById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        organizationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/assign-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignUserToOrganization(@RequestBody @Valid AssignUserToOrganizationDto dto) {
        organizationService.assignUserToOrganization(dto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrganizationResponseDto>> getOrganizationsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(organizationService.getOrganizationsByUser(userId));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganizationResponseDto>> getMyOrganizations() {
        return ResponseEntity.ok(organizationService.getMyOrganizations());
    }
}
