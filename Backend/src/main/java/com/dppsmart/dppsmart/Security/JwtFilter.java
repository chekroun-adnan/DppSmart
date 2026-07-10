package com.dppsmart.dppsmart.Security;

import com.dppsmart.dppsmart.Security.Session.SessionService;
import com.dppsmart.dppsmart.User.Entities.Token;
import com.dppsmart.dppsmart.User.Repositories.TokenRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenRepository tokenRepository;
    private final SessionService sessionService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return pathMatcher.match("/ws/**", path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String token = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token == null) {
            String queryToken = request.getParameter("token");
            if (queryToken != null && !queryToken.isEmpty()) {
                token = queryToken;
            }
        }

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String email;
        try {
            email = jwtService.extractUsername(token);
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Token storedToken = tokenRepository.findByToken(token).orElse(null);

            boolean isTokenValid = storedToken != null
                    && !storedToken.isExpired()
                    && !storedToken.isRevoked();

            if (!isTokenValid) {
                filterChain.doFilter(request, response);
                return;
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);

            try {
                sessionService.touchSession(storedToken.getId());
            } catch (Exception ignored) {
            }
        }

        filterChain.doFilter(request, response);
    }
}
