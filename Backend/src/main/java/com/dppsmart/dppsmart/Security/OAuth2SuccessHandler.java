package com.dppsmart.dppsmart.Security;

import com.dppsmart.dppsmart.Security.Session.SessionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.Token;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.TokenRepository;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Email.Services.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final TokenRepository tokenRepository;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final SessionService sessionService;

    private static final long ACCESS_TOKEN_MINUTES = 15;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email     = oAuth2User.getAttribute("email");
        String name      = oAuth2User.getAttribute("name");
        String googleId  = oAuth2User.getAttribute("sub");
        String avatarUrl = oAuth2User.getAttribute("picture");

        boolean[] isNewUser = {false};
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            isNewUser[0] = true;
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setGoogleId(googleId);
            newUser.setAvatarUrl(avatarUrl);
            newUser.setRole(Roles.CLIENT);
            newUser.setCreatedAt(LocalDateTime.now());
            return userRepository.save(newUser);
        });

        if (isNewUser[0]) {
            emailService.sendWelcomeEmail(email, name != null ? name : email, true);
        }

        if (user.getGoogleId() == null || !user.getGoogleId().equals(googleId)) {
            user.setGoogleId(googleId);
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        }

        List<Token> existing = tokenRepository.findByUserIdAndRevokedFalseAndExpiredFalse(user.getId());
        existing.forEach(t -> { t.setRevoked(true); t.setExpired(true); });
        tokenRepository.saveAll(existing);

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        Token token = new Token();
        token.setUserId(user.getId());
        token.setToken(accessToken);
        token.setRevoked(false);
        token.setExpired(false);
        Token savedToken = tokenRepository.save(token);

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(ACCESS_TOKEN_MINUTES);
        sessionService.createSession(user.getId(), savedToken.getId(), accessToken, request, expiresAt);

        String redirectUrl = frontendBaseUrl + "/oauth2/callback"
                + "?token="        + accessToken
                + "&refreshToken=" + refreshToken
                + "&userId="       + user.getId()
                + "&email="        + email
                + "&role="         + user.getRole().name();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
