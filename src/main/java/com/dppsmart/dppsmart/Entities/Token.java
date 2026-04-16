package com.dppsmart.dppsmart.Entities;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "tokens")
@Data
public class Token {

    @Id
    private String id;

    private String token;

    private boolean revoked;
    private boolean expired;

    private String userId;
}

