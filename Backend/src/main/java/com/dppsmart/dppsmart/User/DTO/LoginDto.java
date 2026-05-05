package com.dppsmart.dppsmart.User.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginDto {
    @Email
    @NotBlank (message = "Email is Required")
    private String email;
    @NotBlank( message = "Password is Required")
    private String password;
}
