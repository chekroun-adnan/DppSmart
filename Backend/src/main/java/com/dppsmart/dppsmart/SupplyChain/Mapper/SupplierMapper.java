package com.dppsmart.dppsmart.SupplyChain.Mapper;

import com.dppsmart.dppsmart.SupplyChain.DTO.CreateSupplierDTO;
import com.dppsmart.dppsmart.SupplyChain.DTO.SupplierResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.Entities.Supplier;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class SupplierMapper {
    public Supplier toEntity(CreateSupplierDTO dto) {
        Supplier s = new Supplier();
        s.setName(dto.getName());
        s.setCompanyName(dto.getCompanyName());
        s.setEmail(dto.getEmail());
        s.setPhone(dto.getPhone());
        s.setAddress(dto.getAddress());
        s.setCity(dto.getCity());
        s.setCountry(dto.getCountry());
        s.setLatitude(dto.getLatitude());
        s.setLongitude(dto.getLongitude());
        s.setOrganizationId(dto.getOrganizationId());
        return s;
    }

    public SupplierResponseDTO toDto(Supplier s) {
        SupplierResponseDTO dto = new SupplierResponseDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setCompanyName(s.getCompanyName());
        dto.setEmail(s.getEmail());
        dto.setPhone(s.getPhone());
        dto.setAddress(s.getAddress());
        dto.setCity(s.getCity());
        dto.setCountry(s.getCountry());
        dto.setLatitude(s.getLatitude());
        dto.setLongitude(s.getLongitude());
        dto.setOrganizationId(s.getOrganizationId());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }
}
