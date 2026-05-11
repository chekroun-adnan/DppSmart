package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateSupplierDTO {
    @NotBlank(message = "id is required")
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
}
