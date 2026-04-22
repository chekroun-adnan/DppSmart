package com.dppsmart.dppsmart.Scan.Mapper;

import com.dppsmart.dppsmart.Scan.DTO.ScanEventResponseDto;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;

public class ScanEventMapper {
    public static ScanEventResponseDto toDto(ScanEvent e) {
        ScanEventResponseDto dto = new ScanEventResponseDto();
        dto.setId(e.getId());
        dto.setProductId(e.getProductId());
        dto.setOrganizationId(e.getOrganizationId());
        dto.setScannedUrl(e.getScannedUrl());
        dto.setScannedAt(e.getScannedAt());
        dto.setIp(e.getIp());
        dto.setUserAgent(e.getUserAgent());
        dto.setReferer(e.getReferer());
        dto.setLatitude(e.getLatitude());
        dto.setLongitude(e.getLongitude());
        dto.setLocationText(e.getLocationText());
        dto.setScannedByUserEmail(e.getScannedByUserEmail());
        return dto;
    }
}

