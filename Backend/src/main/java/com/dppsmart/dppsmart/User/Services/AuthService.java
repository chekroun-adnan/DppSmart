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
import com.dppsmart.dppsmart.Employee.Entities.Employees;
import com.dppsmart.dppsmart.Employee.Repositories.EmployeesRepository;
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
    private final EmployeesRepository employeesRepository;

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

        return buildResponse(accessToken, refreshToken, user);
    }

    public AuthResponse login(LoginDto dto, HttpServletRequest request) {
        String email = dto.getEmail();
        String ip    = com.dppsmart.dppsmart.Security.Session.DeviceParser.extractIp(request);

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

        revokeAllUserTokens(user.getId());

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        Token savedToken = saveUserToken(user, accessToken);

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(ACCESS_TOKEN_MINUTES);
        sessionService.createSession(user.getId(), savedToken.getId(), accessToken, request, expiresAt);

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

        revokeAllUserTokens(user.getId());

        String newAccessToken = jwtService.generateAccessToken(user);
        Token savedToken = saveUserToken(user, newAccessToken);

        sessionService.getSessionsForUser(user.getId(), null)
                .stream()
                .filter(s -> "ACTIVE".equals(s.getSessionStatus()))
                .findFirst()
                .ifPresent(s -> {

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

        sessionService.expireSessionByTokenId(token.getId());
    }

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
        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setOrganizationId(user.getOrganizationId());
        response.setAssignedOrganizationIds(user.getAssignedOrganizationIds());
        response.setFullName(user.getName());

        if (user.getRole() == com.dppsmart.dppsmart.User.Entities.Roles.EMPLOYEE) {
            com.dppsmart.dppsmart.Employee.Entities.Employees emp =
                employeesRepository.findById(user.getId())
                    .or(() -> employeesRepository.findByEmail(user.getEmail()))
                    .orElse(null);
            if (emp != null) {
                response.setEmployeeId(emp.getId());
                response.setEmployeeCode(emp.getEmployeeCode());
                response.setDepartmentId(emp.getDepartmentId());
                response.setDepartmentName(emp.getDepartmentName());
                if (emp.getFullName() != null) response.setFullName(emp.getFullName());
            }
        }

        return response;
    }
}
