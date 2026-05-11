package com.dppsmart.dppsmart.SupplyChain.Entities;

import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "material_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialOrder {
    @Id
    private String id;
    private String orderNumber;
    private String supplierId;
    private String organizationId;
    private String orderedBy;
    private MaterialOrderStatus status;
    private LocalDate expectedDeliveryDate;
    private String notes;
    private Integer totalOrderedQuantity;
    private Integer totalApprovedQuantity;
    private Integer totalRejectedQuantity;
    private List<MaterialOrderItem> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public List<MaterialOrderItem> getItems() {
        return items != null ? items : new ArrayList<>();
    }
}
