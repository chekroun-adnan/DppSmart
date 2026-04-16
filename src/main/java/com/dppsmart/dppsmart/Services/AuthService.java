package com.dppsmart.dppsmart.Services;

import com.dppsmart.dppsmart.DTO.AuthResponse;
import com.dppsmart.dppsmart.DTO.LoginDto;
import com.dppsmart.dppsmart.DTO.RefreshRequest;
import com.dppsmart.dppsmart.DTO.RegisterDto;
import com.dppsmart.dppsmart.Entities.Token;
import com.dppsmart.dppsmart.Entities.User;
import com.dppsmart.dppsmart.Mapper.AuthMapper;
import com.dppsmart.dppsmart.Repositories.TokenRepository;
import com.dppsmart.dppsmart.Repositories.UserRepository;
import com.dppsmart.dppsmart.Security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenRepository tokenRepository;
    private final NotificationService n8nService;

    public AuthResponse register(RegisterDto dto) {

        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = AuthMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(LocalDateTime.now());

        user = userRepository.save(user);
        n8nService.sendUserRegistered(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        saveUserToken(user, accessToken);

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public AuthResponse login(LoginDto dto, HttpServletRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        dto.getEmail(),
                        dto.getPassword()
                )
        );

        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        revokeAllUserTokens(user.getId());
        n8nService.sendLoginAlert(
                user,
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        );

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        saveUserToken(user, accessToken);

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public AuthResponse refresh(RefreshRequest request) {

        String refreshToken = request.getRefreshToken();

        if (!jwtService.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String email = jwtService.extractUsername(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccessToken = jwtService.generateAccessToken(user);

        // Access tokens are validated against MongoDB in JwtFilter; therefore any newly
        // generated access token must be persisted to be accepted by protected endpoints.
        revokeAllUserTokens(user.getId());
        saveUserToken(user, newAccessToken);

        return new AuthResponse(
                newAccessToken,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    public void saveUserToken(User user, String jwt) {

        Token token = new Token();
        token.setUserId(user.getId());
        token.setToken(jwt);
        token.setExpired(false);
        token.setRevoked(false);

        tokenRepository.save(token);
    }

    public void revokeAllUserTokens(String userId) {

        List<Token> tokens =
                tokenRepository.findByUserIdAndRevokedFalseAndExpiredFalse(userId);

        if (tokens.isEmpty()) return;

        tokens.forEach(token -> {
            token.setRevoked(true);
            token.setExpired(true);
        });

        tokenRepository.saveAll(tokens);
    }
}
