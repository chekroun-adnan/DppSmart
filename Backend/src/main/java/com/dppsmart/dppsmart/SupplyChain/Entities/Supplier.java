package com.dppsmart.dppsmart.SupplyChain.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "suppliers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Supplier {
    @Id
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
