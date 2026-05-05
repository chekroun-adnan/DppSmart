package com.dppsmart.dppsmart.Landing.Entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "contact_leads")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ContactLead {
    @Id
    private String id;

    private String name;
    private String email;
    private String company;
    private String message;

    private String ip;
    private String userAgent;
    private LocalDateTime createdAt;
}

