package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SupplierResponseDTO {
    private String id;
    private String name;
    private String companyName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private Double latitude;
    private Double longitude;
    private String organizationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
