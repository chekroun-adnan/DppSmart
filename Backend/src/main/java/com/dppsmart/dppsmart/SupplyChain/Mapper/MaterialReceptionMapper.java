package com.dppsmart.dppsmart.SupplyChain.Mapper;

import com.dppsmart.dppsmart.SupplyChain.DTO.ReceptionResponseDTO;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialReception;
import org.springframework.stereotype.Component;

@Component
public class MaterialReceptionMapper {
    public ReceptionResponseDTO toDto(MaterialReception r) {
        ReceptionResponseDTO dto = new ReceptionResponseDTO();
        dto.setId(r.getId());
        dto.setMaterialOrderId(r.getMaterialOrderId());
        dto.setReceivedBy(r.getReceivedBy());
        dto.setReceivedAt(r.getReceivedAt());
        dto.setDecision(r.getDecision());
        dto.setNotes(r.getNotes());
        dto.setRejectionReason(r.getRejectionReason());
        return dto;
    }
}
