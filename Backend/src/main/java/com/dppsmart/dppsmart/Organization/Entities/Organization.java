package com.dppsmart.dppsmart.Organization.Entities;

import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.ProductStock.Entities.ProductStock;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "organizations")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Organization {

    @Id
    private String id;
    private String name;
    private OrganizationType organizationType;
    private String parentOrganizationId;
    private String createdByUserId;
    private List<MaterialStock> materialStocks;
    private List<ProductStock> productStocks;
    private List<String> subOrganizationIds;

    private String address;
    private String city;
    private String country;
    private String vatNumber;
    private String registrationNumber;
    private String currency;
    private String invoicePrefix;
    private String quotePrefix;

    private String bankName;
    private String accountHolder;
    private String accountNumber;
    private String iban;
    private String swiftCode;
}
