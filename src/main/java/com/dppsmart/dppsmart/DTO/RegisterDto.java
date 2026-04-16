package com.dppsmart.dppsmart.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RegisterDto {
    @NotBlank(message = ("Name is Required"))
    private String name;
    @Email
    @NotBlank(message = ("Email is Required"))
    private String email;
    @NotBlank
    @Size(min = 8, max = 20)
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).*$",
            message = "Weak password"
    )
    private String password;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}