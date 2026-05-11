package com.dppsmart.dppsmart.SupplyChain.Mapper;

import com.dppsmart.dppsmart.SupplyChain.DTO.TrackingResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialTracking;
import org.springframework.stereotype.Component;

@Component
public class MaterialTrackingMapper {
    public TrackingResponseDTO toDto(MaterialTracking t) {
        TrackingResponseDTO dto = new TrackingResponseDTO();
        dto.setId(t.getId());
        dto.setMaterialOrderId(t.getMaterialOrderId());
        dto.setCurrentLatitude(t.getCurrentLatitude());
        dto.setCurrentLongitude(t.getCurrentLongitude());
        dto.setCurrentStatus(t.getCurrentStatus());
        dto.setEstimatedArrival(t.getEstimatedArrival());
        dto.setLastUpdatedAt(t.getLastUpdatedAt());
        return dto;
    }
}
