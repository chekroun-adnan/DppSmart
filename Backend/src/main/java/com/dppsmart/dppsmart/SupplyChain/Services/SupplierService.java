package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SupplyChain.DTO.CreateSupplierDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.SupplierResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.UpdateSupplierDTO;
import com.dppsmart.dppsmart.SupplyChain.Entities.Supplier;
import com.dppsmart.dppsmart.SupplyChain.Mapper.SupplierMapper;
import com.dppsmart.dppsmart.SupplyChain.Repositories.SupplierRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final OrganizationRepository organizationRepository;
    private final SupplierMapper supplierMapper;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public SupplierResponseDTO create(CreateSupplierDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Supplier supplier = supplierMapper.toEntity(dto);
        supplier.setId(NanoIdUtils.randomNanoId());
        supplier.setOrganizationId(organization.getId());
        supplier.setCreatedAt(LocalDateTime.now());
        supplier.setUpdatedAt(LocalDateTime.now());

        Supplier saved = supplierRepository.save(supplier);

        auditService.log("Supplier", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Supplier created: " + saved.getCompanyName());

        return supplierMapper.toDto(saved);
    }

    public List<SupplierResponseDTO> getAll() {
        User user = getCurrentUser();
        return supplierRepository.findAll().stream()
                .filter(s -> permissionService.isAdmin(user) || permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(supplierMapper::toDto)
                .toList();
    }

    public List<SupplierResponseDTO> getByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return supplierRepository.findByOrganizationId(orgId).stream().map(supplierMapper::toDto).toList();
    }

    public SupplierResponseDTO getById(String id) {
        User user = getCurrentUser();
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, supplier.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this supplier");
        }

        return supplierMapper.toDto(supplier);
    }

    public SupplierResponseDTO update(UpdateSupplierDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Supplier supplier = supplierRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        if (!permissionService.canAccessOrganization(user, supplier.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this supplier");
        }

        if (dto.getName() != null) supplier.setName(dto.getName());
        if (dto.getCompanyName() != null) supplier.setCompanyName(dto.getCompanyName());
        if (dto.getEmail() != null) supplier.setEmail(dto.getEmail());
        if (dto.getPhone() != null) supplier.setPhone(dto.getPhone());
        if (dto.getAddress() != null) supplier.setAddress(dto.getAddress());
        if (dto.getCity() != null) supplier.setCity(dto.getCity());
        if (dto.getCountry() != null) supplier.setCountry(dto.getCountry());
        if (dto.getLatitude() != null) supplier.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) supplier.setLongitude(dto.getLongitude());

        supplier.setUpdatedAt(LocalDateTime.now());

        Supplier saved = supplierRepository.save(supplier);

        auditService.log("Supplier", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Supplier updated: " + saved.getCompanyName());

        return supplierMapper.toDto(saved);
    }

    public void delete(String id) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        if (!permissionService.canAccessOrganization(user, supplier.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this supplier");
        }

        supplierRepository.delete(supplier);

        auditService.log("Supplier", id, "DELETE", supplier.getOrganizationId(), null, "Supplier deleted: " + supplier.getCompanyName());
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void validateAdminOrSubAdmin(User user) {
        if (user.getRole() == null || user.getRole().name().equals("EMPLOYEE") || user.getRole().name().equals("CLIENT")) {
            throw new ForbiddenException("Insufficient permissions");
        }
    }
}
