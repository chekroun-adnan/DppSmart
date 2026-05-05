package com.dppsmart.dppsmart.Organization.Mapper;

import com.dppsmart.dppsmart.Organization.DTO.CreateOrganizationDto;
import com.dppsmart.dppsmart.Organization.DTO.OrganizationResponseDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;

public class OrganizationMapper {

    public static OrganizationResponseDto toDto(Organization org) {
        OrganizationResponseDto dto = new OrganizationResponseDto();
        dto.setId(org.getId());
        dto.setName(org.getName());
        dto.setType(org.getOrganizationType());
        dto.setParentOrganizationId(org.getParentOrganizationId());
        return dto;
    }

    public static Organization toEntity(CreateOrganizationDto dto, String userId) {
        Organization org = new Organization();
        org.setName(dto.getName());
        org.setOrganizationType(dto.getType());
        org.setParentOrganizationId(dto.getParentOrganizationId());
        org.setCreatedByUserId(userId);
        return org;
    }
}
