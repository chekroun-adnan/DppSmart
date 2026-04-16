package com.dppsmart.dppsmart.Organization.Mapper;

import com.dppsmart.dppsmart.Organization.DTO.OrganizationResponseDto;
import com.dppsmart.dppsmart.Organization.Entities.Organization;

public class OrganizationMapper {

    public static OrganizationResponseDto toDto(Organization organization){
        OrganizationResponseDto dto = new OrganizationResponseDto();
        dto.setId(organization.getId());
        dto.setName(dto.getName());
        dto.setType(dto.getType());
        dto.setParentOrganizationId(dto.getParentOrganizationId());
        return dto;
    }

    public static Organization toEntity(OrganizationResponseDto dto){
        Organization org = new Organization();
        org.setId(org.getId());
        org.setName(org.getName());
        org.setOrganizationType(org.getOrganizationType());
        org.setParentOrganizationId(org.getParentOrganizationId());
        return org;
    }
}
