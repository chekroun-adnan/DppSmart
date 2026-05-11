package com.dppsmart.dppsmart.SupplyChain.DTO;

import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MaterialOrderResponseDTO {
    private String id;
    private String orderNumber;
    private String supplierId;
    private String supplierName;
    private String organizationId;
    private String orderedBy;
    private MaterialOrderStatus status;
    private LocalDate expectedDeliveryDate;
    private String notes;
    private Integer totalOrderedQuantity;
    private Integer totalApprovedQuantity;
    private Integer totalRejectedQuantity;
    private List<MaterialOrderItemResponseDTO> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
