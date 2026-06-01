package com.dppsmart.dppsmart.User.Services;

import com.dppsmart.dppsmart.Security.Session.BruteForceProtectionService;
import com.dppsmart.dppsmart.Security.Session.SessionService;
import com.dppsmart.dppsmart.User.DTO.AuthResponse;
import com.dppsmart.dppsmart.User.DTO.LoginDto;
import com.dppsmart.dppsmart.User.DTO.RefreshRequest;
import com.dppsmart.dppsmart.User.DTO.RegisterDto;
import com.dppsmart.dppsmart.User.Entities.Token;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Mapper.AuthMapper;
import com.dppsmart.dppsmart.User.Repositories.TokenRepository;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Security.JwtService;
import com.dppsmart.dppsmart.Email.Services.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
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
    private final EmailService emailService;
    private final BruteForceProtectionService bruteForceService;
    private final SessionService sessionService;

    // ─── Access token TTL mirrors JwtService constant (15 min) ───────────────
    private static final long ACCESS_TOKEN_MINUTES = 15;

    public AuthResponse register(RegisterDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = AuthMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user = userRepository.save(user);

        emailService.sendWelcomeEmail(
                user.getEmail(),
                user.getName() != null ? user.getName() : user.getEmail(),
                false
        );

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        Token saved = saveUserToken(user, accessToken);

        // No session for register — first proper login creates one
        return buildResponse(accessToken, refreshToken, user);
    }

    public AuthResponse login(LoginDto dto, HttpServletRequest request) {
        String email = dto.getEmail();
        String ip    = com.dppsmart.dppsmart.Security.Session.DeviceParser.extractIp(request);

        // ── Brute force check BEFORE authenticating ──────────────────────────
        bruteForceService.checkLoginAllowed(email, ip);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, dto.getPassword())
            );
        } catch (BadCredentialsException e) {
            bruteForceService.recordFailure(email, request, "Bad credentials");
            throw new RuntimeException("Invalid email or password");
        } catch (Exception e) {
            bruteForceService.recordFailure(email, request, e.getMessage());
            throw new RuntimeException("Authentication failed");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Revoke previous tokens but keep their sessions marked EXPIRED (audit trail)
        revokeAllUserTokens(user.getId());

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        Token savedToken = saveUserToken(user, accessToken);

        // ── Create session record ─────────────────────────────────────────────
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(ACCESS_TOKEN_MINUTES);
        sessionService.createSession(user.getId(), savedToken.getId(), accessToken, request, expiresAt);

        // ── Record successful attempt ─────────────────────────────────────────
        bruteForceService.recordSuccess(email, request);

        return buildResponse(accessToken, refreshToken, user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtService.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String email = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Expire old session via token revocation
        revokeAllUserTokens(user.getId());

        String newAccessToken = jwtService.generateAccessToken(user);
        Token savedToken = saveUserToken(user, newAccessToken);

        // Update existing active session's tokenId to the new token
        // (find by userId + ACTIVE, update first match)
        sessionService.getSessionsForUser(user.getId(), null)
                .stream()
                .filter(s -> "ACTIVE".equals(s.getSessionStatus()))
                .findFirst()
                .ifPresent(s -> {
                    // Expire old session and let the next real request touch it
                    sessionService.expireSessionByTokenId(s.getId());
                });

        return buildResponse(newAccessToken, refreshToken, user);
    }

    public void logout(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            throw new RuntimeException("Missing Authorization header");
        }

        String tokenValue = bearerToken.substring(7);
        Token token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new RuntimeException("Token not found"));

        token.setRevoked(true);
        token.setExpired(true);
        tokenRepository.save(token);

        // Mark corresponding session as REVOKED
        sessionService.expireSessionByTokenId(token.getId());
    }

    // ─── Shared helpers ───────────────────────────────────────────────────────

    public Token saveUserToken(User user, String jwt) {
        Token token = new Token();
        token.setUserId(user.getId());
        token.setToken(jwt);
        token.setExpired(false);
        token.setRevoked(false);
        return tokenRepository.save(token);
    }

    public void revokeAllUserTokens(String userId) {
        List<Token> tokens =
                tokenRepository.findByUserIdAndRevokedFalseAndExpiredFalse(userId);
        if (tokens.isEmpty()) return;
        tokens.forEach(t -> { t.setRevoked(true); t.setExpired(true); });
        tokenRepository.saveAll(tokens);
    }

    private AuthResponse buildResponse(String accessToken, String refreshToken, User user) {
        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getOrganizationId(),
                user.getAssignedOrganizationIds()
        );
    }
}
