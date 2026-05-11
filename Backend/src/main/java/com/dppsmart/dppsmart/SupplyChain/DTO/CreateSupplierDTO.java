package com.dppsmart.dppsmart.SupplyChain.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSupplierDTO {
    @NotBlank(message = "name is required")
    private String name;
    private String companyName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private Double latitude;
    private Double longitude;
    @NotBlank(message = "organizationId is required")
    private String organizationId;
}
