package com.dppsmart.dppsmart.Landing.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContactRequestDto {

    @NotBlank(message = "name is required")
    @Size(max = 100, message = "name must be 100 characters or fewer")
    private String name;

    @Email(message = "email must be valid")
    @NotBlank(message = "email is required")
    @Size(max = 254, message = "email must be 254 characters or fewer")
    private String email;

    @Size(max = 200, message = "company must be 200 characters or fewer")
    private String company;

    @NotBlank(message = "message is required")
    @Size(max = 2000, message = "message must be 2000 characters or fewer")
    private String message;
}
